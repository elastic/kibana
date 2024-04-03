/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import {
  PushedUserActionPayloadWithoutConnectorIdRt,
  PushedUserActionPayloadRt,
  PushedUserActionWithoutConnectorIdRt,
  PushedUserActionRt,
} from './v1';

describe('Pushed', () => {
  describe('PushedUserActionPayloadWithoutConnectorIdRt', () => {
    const defaultRequest = {
      externalService: {
        connector_name: 'My SN connector',
        external_id: 'external_id',
        external_title: 'external title',
        external_url: 'basicPush.com',
        pushed_at: '2023-01-17T09:46:29.813Z',
        pushed_by: {
          full_name: 'Leslie Knope',
          username: 'lknope',
          email: 'leslie.knope@elastic.co',
        },
      },
    };

    it('has expected attributes in request', () => {
      const query = PushedUserActionPayloadWithoutConnectorIdRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = PushedUserActionPayloadWithoutConnectorIdRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from externalService', () => {
      const query = PushedUserActionPayloadWithoutConnectorIdRt.decode({
        externalService: { ...defaultRequest.externalService, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('PushedUserActionPayloadRt', () => {
    const defaultRequest = {
      externalService: {
        connector_id: 'servicenow-1',
        connector_name: 'My SN connector',
        external_id: 'external_id',
        external_title: 'external title',
        external_url: 'basicPush.com',
        pushed_at: '2023-01-17T09:46:29.813Z',
        pushed_by: {
          full_name: 'Leslie Knope',
          username: 'lknope',
          email: 'leslie.knope@elastic.co',
        },
      },
    };

    it('has expected attributes in request', () => {
      const query = PushedUserActionPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = PushedUserActionPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from externalService', () => {
      const query = PushedUserActionPayloadRt.decode({
        externalService: { ...defaultRequest.externalService, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('PushedUserActionWithoutConnectorIdRt', () => {
    const defaultRequest = {
      type: UserActionTypes.pushed,
      payload: {
        externalService: {
          connector_name: 'My SN connector',
          external_id: 'external_id',
          external_title: 'external title',
          external_url: 'basicPush.com',
          pushed_at: '2023-01-17T09:46:29.813Z',
          pushed_by: {
            full_name: 'Leslie Knope',
            username: 'lknope',
            email: 'leslie.knope@elastic.co',
          },
        },
      },
    };

    it('has expected attributes in request', () => {
      const query = PushedUserActionWithoutConnectorIdRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = PushedUserActionWithoutConnectorIdRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = PushedUserActionWithoutConnectorIdRt.decode({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('PushedUserActionRt', () => {
    const defaultRequest = {
      type: UserActionTypes.pushed,
      payload: {
        externalService: {
          connector_id: 'servicenow-1',
          connector_name: 'My SN connector',
          external_id: 'external_id',
          external_title: 'external title',
          external_url: 'basicPush.com',
          pushed_at: '2023-01-17T09:46:29.813Z',
          pushed_by: {
            full_name: 'Leslie Knope',
            username: 'lknope',
            email: 'leslie.knope@elastic.co',
          },
        },
      },
    };

    it('has expected attributes in request', () => {
      const query = PushedUserActionRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = PushedUserActionRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from externalService', () => {
      const query = PushedUserActionRt.decode({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
