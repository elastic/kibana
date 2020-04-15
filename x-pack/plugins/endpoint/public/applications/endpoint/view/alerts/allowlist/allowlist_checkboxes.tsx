/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiCheckbox,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import * as selectors from '../../../store/alerts/selectors';
import { useAlertListSelector } from '../hooks/use_alerts_selector';
import { AlertAction } from '../../../store/alerts';

export const AllowlistCheckboxes = memo(() => {
  const dispatch: (action: AlertAction) => unknown = useDispatch();
  const {
    advancedOptionsAreOpen,
    filePath,
    sha256,
    signer,
    actingProcessPath,
    closeAlerts,
  } = useAlertListSelector(selectors.allowlistForm);
  const alertData = useAlertListSelector(selectors.selectedAlertDetailsData);

  if (alertData === undefined) {
    return null;
  }

  const openAdvancedOptions = useCallback(() => {
    dispatch({ type: 'userOpenedAllowlistAdvancedOptions' });
  }, [dispatch]);

  const closeAdvancedOptions = useCallback(() => {
    dispatch({ type: 'userClosedAllowlistAdvancedOptions' });
  }, [dispatch]);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: 'userChangedAllowlistForm',
        payload: [event.target.name, event.target.checked],
      });
    },
    [dispatch]
  );

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiCheckbox
            id="1"
            name="filePath"
            label={
              <EuiText>
                <h5>
                  {i18n.translate(
                    'xpack.endpoint.application.endpoint.alerts.allowModal.checkbox.filePath',
                    {
                      defaultMessage: 'File Path',
                    }
                  )}
                </h5>
              </EuiText>
            }
            checked={filePath}
            onChange={onChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiFormRow>
            <EuiText>{alertData.file.path}</EuiText>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiCheckbox
            id="2"
            name="sha256"
            label={
              <EuiText>
                <h5>
                  {i18n.translate(
                    'xpack.endpoint.application.endpoint.alerts.allowModal.checkbox.sha256',
                    {
                      defaultMessage: 'SHA 256',
                    }
                  )}
                </h5>
              </EuiText>
            }
            checked={sha256}
            onChange={onChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiFormRow>
            <EuiText>{alertData.file.hash.sha256}</EuiText>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EuiCheckbox
            id="3"
            name="signer"
            label={
              <EuiText>
                <h5>
                  {i18n.translate(
                    'xpack.endpoint.application.endpoint.alerts.allowModal.checkbox.signer',
                    {
                      defaultMessage: 'Signer',
                    }
                  )}
                </h5>
              </EuiText>
            }
            checked={signer}
            onChange={onChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiFormRow>
            <EuiText>{alertData.file.code_signature.subject_name}</EuiText>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />
      {advancedOptionsAreOpen === true ? (
        <>
          <EuiLink onClick={closeAdvancedOptions}>
            {i18n.translate(
              'xpack.endpoint.application.endpoint.alerts.allowModal.advancedOptions.openLabel',
              {
                defaultMessage: 'Close Advanced Options',
              }
            )}
          </EuiLink>
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            <EuiFlexItem grow={1}>
              <EuiCheckbox
                id="5"
                name="actingProcessPath"
                label={
                  <EuiText>
                    <h5>
                      {i18n.translate(
                        'xpack.endpoint.application.endpoint.alerts.allowModal.checkbox.actingProcessPath',
                        {
                          defaultMessage: 'Acting Process Path',
                        }
                      )}
                    </h5>
                  </EuiText>
                }
                checked={actingProcessPath}
                onChange={onChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <EuiFormRow>
                <EuiText>
                  {alertData.process.executable /* TODO: idk if this is the correct field */}
                </EuiText>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <EuiLink onClick={openAdvancedOptions}>
          {i18n.translate(
            'xpack.endpoint.application.endpoint.alerts.allowModal.advancedOptions.closeLabel',
            {
              defaultMessage: 'Open Advanced Options',
            }
          )}
        </EuiLink>
      )}
      <EuiSpacer />
      <EuiCheckbox
        id="4"
        name="closeAlerts"
        label={i18n.translate(
          'xpack.endpoint.application.endpoint.alerts.allowModal.checkbox.closeAlerts',
          {
            defaultMessage:
              'Close alerts that match the above rule and all existing allowlist rules. (Recommended)',
          }
        )}
        checked={closeAlerts}
        onChange={onChange}
      />
      <EuiSpacer />
    </>
  );
});
