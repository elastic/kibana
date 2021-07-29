/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { TLSFields, TLSRole } from './tls_fields';
import { ConfigKeys, VerificationMode } from './types';
import { TLSFieldsContextProvider, defaultTLSFields as defaultValues } from './contexts';

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('<TLSFields />', () => {
  const WrappedComponent = ({
    tlsRole = TLSRole.CLIENT,
    isEnabled = true,
  }: {
    tlsRole?: TLSRole;
    isEnabled?: boolean;
  }) => {
    return (
      <TLSFieldsContextProvider defaultValues={defaultValues}>
        <TLSFields tlsRole={tlsRole} isEnabled={isEnabled} />
      </TLSFieldsContextProvider>
    );
  };
  it('renders TLSFields', () => {
    const { getByLabelText, getByText } = render(<WrappedComponent />);

    expect(getByText('Certificate settings')).toBeInTheDocument();
    expect(getByText('Supported TLS protocols')).toBeInTheDocument();
    expect(getByLabelText('Client certificate')).toBeInTheDocument();
    expect(getByLabelText('Client key')).toBeInTheDocument();
    expect(getByLabelText('Certificate authorities')).toBeInTheDocument();
    expect(getByLabelText('Verification mode')).toBeInTheDocument();
  });

  it('handles role', () => {
    const { getByLabelText, rerender } = render(<WrappedComponent tlsRole={TLSRole.SERVER} />);

    expect(getByLabelText('Server certificate')).toBeInTheDocument();
    expect(getByLabelText('Server key')).toBeInTheDocument();

    rerender(<WrappedComponent tlsRole={TLSRole.CLIENT} />);
  });

  it('updates fields and calls onChange', async () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const clientCertificate = getByLabelText('Client certificate') as HTMLInputElement;
    const clientKey = getByLabelText('Client key') as HTMLInputElement;
    const clientKeyPassphrase = getByLabelText('Client key passphrase') as HTMLInputElement;
    const certificateAuthorities = getByLabelText('Certificate authorities') as HTMLInputElement;
    const verificationMode = getByLabelText('Verification mode') as HTMLInputElement;

    const newValues = {
      [ConfigKeys.TLS_CERTIFICATE]: 'sampleClientCertificate',
      [ConfigKeys.TLS_KEY]: 'sampleClientKey',
      [ConfigKeys.TLS_KEY_PASSPHRASE]: 'sampleClientKeyPassphrase',
      [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: 'sampleCertificateAuthorities',
      [ConfigKeys.TLS_VERIFICATION_MODE]: VerificationMode.NONE,
    };

    fireEvent.change(clientCertificate, {
      target: { value: newValues[ConfigKeys.TLS_CERTIFICATE] },
    });
    fireEvent.change(clientKey, { target: { value: newValues[ConfigKeys.TLS_KEY] } });
    fireEvent.change(clientKeyPassphrase, {
      target: { value: newValues[ConfigKeys.TLS_KEY_PASSPHRASE] },
    });
    fireEvent.change(certificateAuthorities, {
      target: { value: newValues[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES] },
    });
    fireEvent.change(verificationMode, {
      target: { value: newValues[ConfigKeys.TLS_VERIFICATION_MODE] },
    });

    expect(clientCertificate.value).toEqual(newValues[ConfigKeys.TLS_CERTIFICATE]);
    expect(clientKey.value).toEqual(newValues[ConfigKeys.TLS_KEY]);
    expect(certificateAuthorities.value).toEqual(newValues[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]);
    expect(verificationMode.value).toEqual(newValues[ConfigKeys.TLS_VERIFICATION_MODE]);
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
