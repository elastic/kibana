/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CertificateExpirationForm } from '../certificate_form';
import { shallowWithRouter, mountWithRouter } from '../../../lib';

describe('CertificateForm', () => {
  it('shallow renders expected elements for valid props', () => {
    expect(
      shallowWithRouter(
        <CertificateExpirationForm
          loading={false}
          onChange={jest.fn()}
          formFields={{
            heartbeatIndices: 'heartbeat-8*',
            certExpirationThreshold: 7,
            certAgeThreshold: 36,
            defaultConnectors: [],
          }}
          fieldErrors={null}
          isDisabled={false}
        />
      )
    ).toMatchSnapshot();
  });

  it('submits number values for certs settings fields', () => {
    const onChangeMock = jest.fn();
    const wrapper = mountWithRouter(
      <CertificateExpirationForm
        loading={false}
        onChange={onChangeMock}
        formFields={{
          heartbeatIndices: 'heartbeat-8*',
          certExpirationThreshold: 7,
          certAgeThreshold: 36,
          defaultConnectors: [],
        }}
        fieldErrors={null}
        isDisabled={false}
      />
    );

    const inputs = wrapper.find('input');

    expect(inputs).toHaveLength(2);

    // expiration threshold input
    inputs.at(0).simulate('change', {
      target: {
        value: '23',
      },
    });

    // age threshold input
    inputs.at(1).simulate('change', {
      target: {
        value: '56',
      },
    });

    expect(onChangeMock).toHaveBeenCalledTimes(2);

    expect(onChangeMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "certExpirationThreshold": 23,
        },
      ]
    `);

    expect(onChangeMock.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        Object {
          "certAgeThreshold": 56,
        },
      ]
    `);
  });

  it('submits undefined for NaN values', () => {
    const onChangeMock = jest.fn();
    const wrapper = mountWithRouter(
      <CertificateExpirationForm
        loading={false}
        onChange={onChangeMock}
        formFields={{
          heartbeatIndices: 'heartbeat-8*',
          certExpirationThreshold: 7,
          certAgeThreshold: 36,
          defaultConnectors: [],
        }}
        fieldErrors={null}
        isDisabled={false}
      />
    );

    const inputs = wrapper.find('input');

    expect(inputs).toHaveLength(2);

    // expiration threshold input
    inputs.at(0).simulate('change', {
      target: {
        value: 'A',
      },
    });

    // age threshold input
    inputs.at(1).simulate('change', {
      target: {
        value: 'g',
      },
    });

    expect(onChangeMock).toHaveBeenCalledTimes(2);

    expect(onChangeMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "certExpirationThreshold": undefined,
        },
      ]
    `);

    expect(onChangeMock.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        Object {
          "certAgeThreshold": undefined,
        },
      ]
    `);
  });
});
