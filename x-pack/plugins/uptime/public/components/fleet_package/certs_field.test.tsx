/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { CertsField, SSLRole, FieldKey, VerificationMode, FieldConfig } from './certs_field';

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('<CertsField />', () => {
  const onChange = jest.fn();
  const WrappedComponent = ({
    sslRole = SSLRole.CLIENT,
    fieldConfig,
  }: {
    sslRole?: SSLRole;
    fieldConfig?: FieldConfig;
  }) => {
    return <CertsField onChange={onChange} sslRole={sslRole} fieldConfig={fieldConfig} />;
  };
  it('renders CertsField', () => {
    const { getByLabelText, getByText } = render(<WrappedComponent />);

    expect(getByText('Certificate settings')).toBeInTheDocument();
    expect(getByLabelText('Client certificate')).toBeInTheDocument();
    expect(getByLabelText('Client key')).toBeInTheDocument();
    expect(getByLabelText('Certificate authorities')).toBeInTheDocument();
    expect(getByLabelText('Verification mode')).toBeInTheDocument();
  });

  it('handles role', () => {
    const { getByLabelText, rerender } = render(<WrappedComponent sslRole={SSLRole.SERVER} />);

    expect(getByLabelText('Server certificate')).toBeInTheDocument();
    expect(getByLabelText('Server key')).toBeInTheDocument();

    rerender(<WrappedComponent sslRole={SSLRole.CLIENT} />);
  });

  it('updates fields and calls onChange', async () => {
    const { getByLabelText } = render(<WrappedComponent />);

    const clientCertificate = getByLabelText('Client certificate') as HTMLInputElement;
    const clientKey = getByLabelText('Client key') as HTMLInputElement;
    const clientKeyPassphrase = getByLabelText('Client key passphrase') as HTMLInputElement;
    const certificateAuthorities = getByLabelText('Certificate authorities') as HTMLInputElement;
    const verificationMode = getByLabelText('Verification mode') as HTMLInputElement;

    const newValues = {
      [FieldKey.CERTIFICATE]: 'sampleClientCertificate',
      [FieldKey.KEY]: 'sampleClientKey',
      [FieldKey.KEY_PASSPHRASE]: 'sampleClientKeyPassphrase',
      [FieldKey.CERTIFICATE_AUTHORITIES]: 'sampleCertificateAuthorities',
      [FieldKey.VERIFICATION_MODE]: VerificationMode.NONE,
    };

    fireEvent.change(clientCertificate, { target: { value: newValues[FieldKey.CERTIFICATE] } });
    fireEvent.change(clientKey, { target: { value: newValues[FieldKey.KEY] } });
    fireEvent.change(clientKeyPassphrase, { target: { value: newValues[FieldKey.KEY] } });
    fireEvent.change(certificateAuthorities, {
      target: { value: newValues[FieldKey.CERTIFICATE_AUTHORITIES] },
    });
    fireEvent.change(verificationMode, {
      target: { value: newValues[FieldKey.VERIFICATION_MODE] },
    });

    expect(clientCertificate.value).toEqual(newValues[FieldKey.CERTIFICATE]);
    expect(clientKey.value).toEqual(newValues[FieldKey.KEY]);
    expect(certificateAuthorities.value).toEqual(newValues[FieldKey.CERTIFICATE_AUTHORITIES]);
    expect(verificationMode.value).toEqual(newValues[FieldKey.VERIFICATION_MODE]);

    await waitFor(() => {
      expect(onChange).toBeCalledWith({
        [FieldKey.CERTIFICATE]: newValues[FieldKey.CERTIFICATE],
        [FieldKey.KEY]: newValues[FieldKey.KEY],
        [FieldKey.KEY_PASSPHRASE]: newValues[FieldKey.KEY],
        [FieldKey.CERTIFICATE_AUTHORITIES]: newValues[FieldKey.CERTIFICATE_AUTHORITIES],
        [FieldKey.VERIFICATION_MODE]: newValues[FieldKey.VERIFICATION_MODE],
      });
    });
  });

  it('shows warning when verification mode is set to none', () => {
    const { getByLabelText, getByText } = render(<WrappedComponent />);

    const verificationMode = getByLabelText('Verification mode') as HTMLInputElement;

    fireEvent.change(verificationMode, {
      target: { value: VerificationMode.NONE },
    });

    expect(getByText('Proceed with caution!')).toBeInTheDocument();
  });

  it('respects fieldConfig', () => {
    const fieldConfig = {
      certificateAuthorities: {
        isInvalid: true,
        isOptional: false,
        error: 'caError',
        helpText: 'caHelpText',
      },
      certificate: {
        isInvalid: true,
        isOptional: false,
        error: 'certificateError',
        helpText: 'certificateHelpText',
      },
      key: {
        isInvalid: true,
        isOptional: false,
        error: 'keyError',
        helpText: 'keyHelpText',
      },
      keyPassphrase: {
        isInvalid: true,
        isOptional: false,
        error: 'keyPassphraseError',
        helpText: 'keyPassphraseHelpText',
      },
      verificationMode: {
        isInvalid: true,
        isOptional: false,
        error: 'verificationModeError',
        helpText: 'verificationModeHelpText',
      },
    };
    const { getByText } = render(<WrappedComponent fieldConfig={fieldConfig} />);

    expect(getByText('caError')).toBeInTheDocument();
    expect(getByText('caHelpText')).toBeInTheDocument();
    expect(getByText('certificateError')).toBeInTheDocument();
    expect(getByText('certificateHelpText')).toBeInTheDocument();
    expect(getByText('keyError')).toBeInTheDocument();
    expect(getByText('keyHelpText')).toBeInTheDocument();
    expect(getByText('keyPassphraseHelpText')).toBeInTheDocument();
    expect(getByText('keyPassphraseError')).toBeInTheDocument();
    expect(getByText('verificationModeError')).toBeInTheDocument();
    expect(getByText('verificationModeHelpText')).toBeInTheDocument();
  });
});
