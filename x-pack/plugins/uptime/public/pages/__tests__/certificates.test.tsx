/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithRouter, renderWithRouter } from '../../lib';
import { CertificatesPage } from '../certificates';
import * as redux from 'react-redux';
import moment from 'moment';

describe('CertificatesPage', () => {
  beforeAll(() => {
    const spy = jest.spyOn(redux, 'useDispatch');
    spy.mockReturnValue(jest.fn());

    const spy1 = jest.spyOn(redux, 'useSelector');
    spy1.mockReturnValue({
      data: {
        certs: [
          {
            monitors: [
              {
                name: 'Cloudflare Homepage',
                id: 'cloudflare-home',
                url: 'https://www.cloudflare.com',
              },
            ],
            issuer: 'DigiCert ECC Extended Validation Server CA',
            sha1: '6a4cb249b71b6659dabb960115fd7a01bfc9968c',
            sha256: '84694645cbd183bf9be472ce702bd189246e1fcd1544ffead466d956a71690bf',
            not_after: moment().add(4, 'm'),
            not_before: moment().subtract(4, 'm'),
            common_name: 'cloudflare.com',
          },
          {
            monitors: [{ name: '', id: 'example.net', url: 'https://example.net' }],
            issuer: 'DigiCert SHA2 Secure Server CA',
            sha1: '7bb698386970363d2919cc5772846984ffd4a889',
            sha256: '9250711c54de546f4370e0c3d3a3ec45bc96092a25a4a71a1afa396af7047eb8',
            not_after: moment().add(4, 'm'),
            not_before: moment().subtract(4, 'm'),
            common_name: 'www.example.org',
          },
        ],
        total: 2,
      },
    });

    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn(),
    };
    global.localStorage = localStorageMock;
  });

  it('shallow renders expected elements for valid props', () => {
    expect(shallowWithRouter(<CertificatesPage />)).toMatchSnapshot();
  });

  it('renders expected elements for valid props', () => {
    expect(renderWithRouter(<CertificatesPage />)).toMatchSnapshot();
  });
});
