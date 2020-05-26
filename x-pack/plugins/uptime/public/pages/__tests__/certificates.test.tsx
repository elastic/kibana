/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithRouter, shallowWithRouter } from '../../lib';
import { CertificatesPage } from '../certificates';
import * as redux from 'react-redux';

describe('CertificatesPage', () => {
  beforeAll(() => {
    const spy = jest.spyOn(redux, 'useDispatch');
    spy.mockReturnValue(jest.fn());

    const spy1 = jest.spyOn(redux, 'useSelector');

    // jest.spyOn(moment.fn, 'diff').mockReturnValue(55555555);

    jest.mock('moment', () => () => ({ format: () => '2018–01–30T12:34:56+00:00' }));

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
            not_after: '2020-07-28T08:30:36.000Z',
            not_before: '2020-05-05T08:30:36.000Z',
            common_name: 'cloudflare.com',
          },
          {
            monitors: [{ name: '', id: 'example.net', url: 'https://example.net' }],
            issuer: 'DigiCert SHA2 Secure Server CA',
            sha1: '7bb698386970363d2919cc5772846984ffd4a889',
            sha256: '9250711c54de546f4370e0c3d3a3ec45bc96092a25a4a71a1afa396af7047eb8',
            not_after: '2020-08-28T12:00:00.000Z',
            not_before: '2019-08-29T00:00:00.000Z',
            common_name: 'www.example.org',
          },
        ],
        total: 2,
      },
    });

    // @ts-ignore
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn(),
    };
  });

  it('shallow renders expected elements for valid props', () => {
    expect(shallowWithRouter(<CertificatesPage />)).toMatchSnapshot();
  });

  it('renders expected elements for valid props', () => {
    expect(renderWithRouter(<CertificatesPage />)).toMatchSnapshot();
  });
});
