/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import type { Request, RequestOptions } from './cloud_service';
import { AWS, AWSCloudService, AWSResponse } from './aws';

type Callback = (err: unknown, res: unknown) => void;

describe('AWS', () => {
  const expectedFilename = '/sys/hypervisor/uuid';
  const expectedEncoding = 'utf8';
  // mixed case to ensure we check for ec2 after lowercasing
  const ec2Uuid = 'eC2abcdef-ghijk\n';
  const ec2FileSystem = {
    readFile: (filename: string, encoding: string, callback: Callback) => {
      expect(filename).toEqual(expectedFilename);
      expect(encoding).toEqual(expectedEncoding);

      callback(null, ec2Uuid);
    },
  } as typeof fs;

  it('is named "aws"', () => {
    expect(AWS.getName()).toEqual('aws');
  });

  describe('_checkIfService', () => {
    it('handles expected response', async () => {
      const id = 'abcdef';
      const request = ((req: RequestOptions, callback: Callback) => {
        expect(req.method).toEqual('GET');
        expect(req.uri).toEqual(
          'http://169.254.169.254/2016-09-02/dynamic/instance-identity/document'
        );
        expect(req.json).toEqual(true);

        const body = `{"instanceId": "${id}","availabilityZone":"us-fake-2c", "imageId" : "ami-6df1e514"}`;

        callback(null, { statusCode: 200, body });
      }) as Request;
      // ensure it does not use the fs to trump the body
      const awsCheckedFileSystem = new AWSCloudService({
        _fs: ec2FileSystem,
        _isWindows: false,
      });

      const response = await awsCheckedFileSystem._checkIfService(request);

      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toEqual({
        name: AWS.getName(),
        id,
        region: undefined,
        vm_type: undefined,
        zone: 'us-fake-2c',
        metadata: {
          imageId: 'ami-6df1e514',
        },
      });
    });

    it('handles request without a usable body by downgrading to UUID detection', async () => {
      const request = ((_req: RequestOptions, callback: Callback) =>
        callback(null, { statusCode: 404 })) as Request;
      const awsCheckedFileSystem = new AWSCloudService({
        _fs: ec2FileSystem,
        _isWindows: false,
      });

      const response = await awsCheckedFileSystem._checkIfService(request);

      expect(response.isConfirmed()).toBe(true);
      expect(response.toJSON()).toEqual({
        name: AWS.getName(),
        id: ec2Uuid.trim().toLowerCase(),
        region: undefined,
        vm_type: undefined,
        zone: undefined,
        metadata: undefined,
      });
    });

    it('handles request failure by downgrading to UUID detection', async () => {
      const failedRequest = ((_req: RequestOptions, callback: Callback) =>
        callback(new Error('expected: request failed'), null)) as Request;
      const awsCheckedFileSystem = new AWSCloudService({
        _fs: ec2FileSystem,
        _isWindows: false,
      });

      const response = await awsCheckedFileSystem._checkIfService(failedRequest);

      expect(response.isConfirmed()).toBe(true);
      expect(response.toJSON()).toEqual({
        name: AWS.getName(),
        id: ec2Uuid.trim().toLowerCase(),
        region: undefined,
        vm_type: undefined,
        zone: undefined,
        metadata: undefined,
      });
    });

    it('handles not running on AWS', async () => {
      const failedRequest = ((_req: RequestOptions, callback: Callback) =>
        callback(null, null)) as Request;
      const awsIgnoredFileSystem = new AWSCloudService({
        _fs: ec2FileSystem,
        _isWindows: true,
      });

      const response = await awsIgnoredFileSystem._checkIfService(failedRequest);

      expect(response.getName()).toEqual(AWS.getName());
      expect(response.isConfirmed()).toBe(false);
    });
  });

  describe('_parseBody', () => {
    it('parses object in expected format', () => {
      const body: AWSResponse = {
        devpayProductCodes: null,
        privateIp: '10.0.0.38',
        availabilityZone: 'us-west-2c',
        version: '2010-08-31',
        instanceId: 'i-0c7a5b7590a4d811c',
        billingProducts: null,
        instanceType: 't2.micro',
        accountId: '1234567890',
        architecture: 'x86_64',
        kernelId: null,
        ramdiskId: null,
        imageId: 'ami-6df1e514',
        pendingTime: '2017-07-06T02:09:12Z',
        region: 'us-west-2',
        marketplaceProductCodes: null,
      };

      const response = AWS._parseBody(body);

      expect(response?.getName()).toEqual(AWS.getName());
      expect(response?.isConfirmed()).toEqual(true);
      expect(response?.toJSON()).toEqual({
        name: 'aws',
        id: 'i-0c7a5b7590a4d811c',
        vm_type: 't2.micro',
        region: 'us-west-2',
        zone: 'us-west-2c',
        metadata: {
          version: '2010-08-31',
          architecture: 'x86_64',
          kernelId: null,
          marketplaceProductCodes: null,
          ramdiskId: null,
          imageId: 'ami-6df1e514',
          pendingTime: '2017-07-06T02:09:12Z',
        },
      });
    });

    it('ignores unexpected response body', () => {
      // @ts-expect-error
      expect(AWS._parseBody(undefined)).toBe(null);
      // @ts-expect-error
      expect(AWS._parseBody(null)).toBe(null);
      // @ts-expect-error
      expect(AWS._parseBody({})).toBe(null);
      // @ts-expect-error
      expect(AWS._parseBody({ privateIp: 'a.b.c.d' })).toBe(null);
    });
  });

  describe('_tryToDetectUuid', () => {
    it('checks the file system for UUID if not Windows', async () => {
      const awsCheckedFileSystem = new AWSCloudService({
        _fs: ec2FileSystem,
        _isWindows: false,
      });

      const response = await awsCheckedFileSystem._tryToDetectUuid();

      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toEqual({
        name: AWS.getName(),
        id: ec2Uuid.trim().toLowerCase(),
        region: undefined,
        zone: undefined,
        vm_type: undefined,
        metadata: undefined,
      });
    });

    it('ignores UUID if it does not start with ec2', async () => {
      const notEC2FileSystem = {
        readFile: (filename: string, encoding: string, callback: Callback) => {
          expect(filename).toEqual(expectedFilename);
          expect(encoding).toEqual(expectedEncoding);

          callback(null, 'notEC2');
        },
      } as typeof fs;

      const awsCheckedFileSystem = new AWSCloudService({
        _fs: notEC2FileSystem,
        _isWindows: false,
      });

      const response = await awsCheckedFileSystem._tryToDetectUuid();

      expect(response.isConfirmed()).toEqual(false);
    });

    it('does NOT check the file system for UUID on Windows', async () => {
      const awsUncheckedFileSystem = new AWSCloudService({
        _fs: ec2FileSystem,
        _isWindows: true,
      });

      const response = await awsUncheckedFileSystem._tryToDetectUuid();

      expect(response.isConfirmed()).toEqual(false);
    });

    it('does NOT handle file system exceptions', async () => {
      const fileDNE = new Error('File DNE');
      const awsFailedFileSystem = new AWSCloudService({
        _fs: ({
          readFile: () => {
            throw fileDNE;
          },
        } as unknown) as typeof fs,
        _isWindows: false,
      });

      expect(async () => {
        await awsFailedFileSystem._tryToDetectUuid();
      }).rejects.toThrowError(fileDNE);
    });
  });
});
