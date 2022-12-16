/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'jest-canvas-mock';

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { ZipUrlTLSFields } from './zip_url_tls_fields';
import { ConfigKey, VerificationMode } from '../types';
import {
  BrowserSimpleFieldsContextProvider,
  PolicyConfigContextProvider,
  defaultBrowserSimpleFields as defaultValues,
} from '../contexts';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('<SourceField />', () => {
  const WrappedComponent = ({ isEnabled = true }: { isEnabled?: boolean }) => {
    return (
      <BrowserSimpleFieldsContextProvider defaultValues={defaultValues}>
        <PolicyConfigContextProvider defaultIsZipUrlTLSEnabled={isEnabled}>
          <ZipUrlTLSFields />
        </PolicyConfigContextProvider>
      </BrowserSimpleFieldsContextProvider>
    );
  };
  it('renders ZipUrlTLSFields', () => {
    const { getByLabelText, getByText } = render(<WrappedComponent isEnabled={false} />);

    const toggle = getByText('Enable TLS configuration for Zip URL');

    fireEvent.click(toggle);

    expect(getByText('Certificate settings')).toBeInTheDocument();
    expect(getByText('Supported TLS protocols')).toBeInTheDocument();
    expect(getByLabelText('Client certificate')).toBeInTheDocument();
    expect(getByLabelText('Client key')).toBeInTheDocument();
    expect(getByLabelText('Certificate authorities')).toBeInTheDocument();
    expect(getByLabelText('Verification mode')).toBeInTheDocument();
  });

  it('updates fields', async () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const clientCertificate = getByLabelText('Client certificate') as HTMLInputElement;
    const clientKey = getByLabelText('Client key') as HTMLInputElement;
    const clientKeyPassphrase = getByLabelText('Client key passphrase') as HTMLInputElement;
    const certificateAuthorities = getByLabelText('Certificate authorities') as HTMLInputElement;
    const verificationMode = getByLabelText('Verification mode') as HTMLInputElement;

    const newValues = {
      [ConfigKey.TLS_CERTIFICATE]: 'sampleClientCertificate',
      [ConfigKey.TLS_KEY]: 'sampleClientKey',
      [ConfigKey.TLS_KEY_PASSPHRASE]: 'sampleClientKeyPassphrase',
      [ConfigKey.TLS_CERTIFICATE_AUTHORITIES]: 'sampleCertificateAuthorities',
      [ConfigKey.TLS_VERIFICATION_MODE]: VerificationMode.NONE,
    };

    fireEvent.change(clientCertificate, {
      target: { value: newValues[ConfigKey.TLS_CERTIFICATE] },
    });
    fireEvent.change(clientKey, { target: { value: newValues[ConfigKey.TLS_KEY] } });
    fireEvent.change(clientKeyPassphrase, {
      target: { value: newValues[ConfigKey.TLS_KEY_PASSPHRASE] },
    });
    fireEvent.change(certificateAuthorities, {
      target: { value: newValues[ConfigKey.TLS_CERTIFICATE_AUTHORITIES] },
    });
    fireEvent.change(verificationMode, {
      target: { value: newValues[ConfigKey.TLS_VERIFICATION_MODE] },
    });

    expect(clientCertificate.value).toEqual(newValues[ConfigKey.TLS_CERTIFICATE]);
    expect(clientKey.value).toEqual(newValues[ConfigKey.TLS_KEY]);
    expect(certificateAuthorities.value).toEqual(newValues[ConfigKey.TLS_CERTIFICATE_AUTHORITIES]);
    expect(verificationMode.value).toEqual(newValues[ConfigKey.TLS_VERIFICATION_MODE]);
  });

  it('shows warning when verification mode is set to none', () => {
    const { getByLabelText, getByText } = render(<WrappedComponent />);

    const verificationMode = getByLabelText('Verification mode') as HTMLInputElement;

    fireEvent.change(verificationMode, {
      target: { value: VerificationMode.NONE },
    });

    expect(getByText('Disabling TLS')).toBeInTheDocument();
  });

  it('does not show fields when isEnabled is false', async () => {
    const { queryByLabelText } = render(<WrappedComponent isEnabled={false} />);

    expect(queryByLabelText('Client certificate')).not.toBeInTheDocument();
    expect(queryByLabelText('Client key')).not.toBeInTheDocument();
    expect(queryByLabelText('Client key passphrase')).not.toBeInTheDocument();
    expect(queryByLabelText('Certificate authorities')).not.toBeInTheDocument();
    expect(queryByLabelText('verification mode')).not.toBeInTheDocument();
  });
});
