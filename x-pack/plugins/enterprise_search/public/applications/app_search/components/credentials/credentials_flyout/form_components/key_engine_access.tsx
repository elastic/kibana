/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues, useActions } from 'kea';
import {
  EuiFormRow,
  EuiRadio,
  EuiCheckbox,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AppLogic } from '../../../../app_logic';
import { CredentialsLogic } from '../../credentials_logic';

export const FormKeyEngineAccess: React.FC = () => {
  const { myRole } = useValues(AppLogic);
  const { setAccessAllEngines } = useActions(CredentialsLogic);
  const { fullEngineAccessChecked } = useValues(CredentialsLogic);

  return (
    <>
      <EuiSpacer />
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.credentials.formEngineAccess.label',
          { defaultMessage: 'Engine Access Control' }
        )}
      >
        <>
          <EuiRadio
            name="engine_access"
            id="all_engines"
            label={
              <>
                <EuiTitle size="xxs">
                  <h3>
                    {i18n.translate(
                      'xpack.enterpriseSearch.appSearch.credentials.formEngineAccess.fullAccess.label',
                      { defaultMessage: 'Full Engine Access' }
                    )}
                  </h3>
                </EuiTitle>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.credentials.formEngineAccess.fullAccess.helpText',
                    { defaultMessage: 'Access to all current and future Engines.' }
                  )}
                </EuiText>
              </>
            }
            hidden={!myRole.canAccessAllEngines}
            checked={fullEngineAccessChecked}
            value={fullEngineAccessChecked.toString()}
            onChange={() => setAccessAllEngines(true)}
          />
          <EuiSpacer size="s" />
          <EuiRadio
            name="engine_access"
            id="specific_engines"
            label={
              <>
                <EuiTitle size="xxs">
                  <h3>
                    {i18n.translate(
                      'xpack.enterpriseSearch.appSearch.credentials.formEngineAccess.limitedAccess.label',
                      { defaultMessage: 'Limited Engine Access' }
                    )}
                  </h3>
                </EuiTitle>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.credentials.formEngineAccess.limitedAccess.helpText',
                    { defaultMessage: 'Limit key access to specific Engines.' }
                  )}
                </EuiText>
              </>
            }
            checked={!fullEngineAccessChecked}
            value={(!fullEngineAccessChecked).toString()}
            onChange={() => setAccessAllEngines(false)}
          />
        </>
      </EuiFormRow>
      {!fullEngineAccessChecked && <EngineSelection />}
    </>
  );
};

export const EngineSelection: React.FC = () => {
  const { onEngineSelect } = useActions(CredentialsLogic);
  const { activeApiToken, engines } = useValues(CredentialsLogic);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiPanel>
        <EuiTitle size="xs">
          <h4>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.credentials.formEngineAccess.engineAccess.label',
              { defaultMessage: 'Select Engines' }
            )}
          </h4>
        </EuiTitle>
        <EuiText>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.credentials.formEngineAccess.engineAccess.helpText',
            { defaultMessage: 'Engines which the key can access:' }
          )}
        </EuiText>
        <EuiSpacer size="s" />
        {engines.map((engine) => (
          <EuiCheckbox
            key={engine.name}
            name={engine.name}
            id={`engine_${engine.name}`}
            label={engine.name}
            checked={!!activeApiToken?.engines?.includes(engine.name)}
            onChange={() => onEngineSelect(engine.name)}
          />
        ))}
      </EuiPanel>
    </>
  );
};
