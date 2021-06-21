/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiButton, EuiCallOut, EuiSelect, EuiSpacer, EuiText } from '@elastic/eui';

import { SO_SEARCH_LIMIT } from '../../applications/fleet/constants';
import type { GetEnrollmentAPIKeysResponse } from '../../applications/fleet/types';
import {
  sendGetEnrollmentAPIKeys,
  useStartServices,
  sendCreateEnrollmentAPIKey,
} from '../../applications/fleet/hooks';

interface Props {
  agentPolicyId?: string;
  onKeyChange: (key?: string) => void;
}

export const AdvancedAgentAuthenticationSettings: FunctionComponent<Props> = ({
  agentPolicyId,
  onKeyChange,
}) => {
  const { notifications } = useStartServices();
  const [enrollmentAPIKeys, setEnrollmentAPIKeys] = useState<GetEnrollmentAPIKeysResponse['list']>(
    []
  );
  // TODO: Remove this piece of state since we don't need it here. The currently selected enrollment API key only
  // needs to live on the form
  const [selectedEnrollmentApiKey, setSelectedEnrollmentApiKey] = useState<undefined | string>();
  const [isLoadingEnrollmentKey, setIsLoadingEnrollmentKey] = useState(false);
  const [isAuthenticationSettingsOpen, setIsAuthenticationSettingsOpen] = useState<boolean>(false);

  const onCreateEnrollmentTokenClick = async () => {
    setIsLoadingEnrollmentKey(true);
    if (agentPolicyId) {
      try {
        const res = await sendCreateEnrollmentAPIKey({ policy_id: agentPolicyId });
        if (res.error) {
          throw res.error;
        }
        setIsLoadingEnrollmentKey(false);
        if (!res.data?.item) {
          return;
        }
        setEnrollmentAPIKeys([res.data.item]);
        setSelectedEnrollmentApiKey(res.data.item.id);
        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.newEnrollmentKey.keyCreatedToasts', {
            defaultMessage: 'Enrollment token created',
          })
        );
      } catch (error) {
        setIsLoadingEnrollmentKey(false);
        notifications.toasts.addError(error, {
          title: 'Error',
        });
      }
    }
  };

  useEffect(
    function triggerOnKeyChangeEffect() {
      if (onKeyChange) {
        onKeyChange(selectedEnrollmentApiKey);
      }
    },
    [onKeyChange, selectedEnrollmentApiKey]
  );

  useEffect(
    function useEnrollmentKeysForAgentPolicyEffect() {
      if (!agentPolicyId) {
        setIsAuthenticationSettingsOpen(true);
        setEnrollmentAPIKeys([]);
        return;
      }

      async function fetchEnrollmentAPIKeys() {
        try {
          const res = await sendGetEnrollmentAPIKeys({
            page: 1,
            perPage: SO_SEARCH_LIMIT,
          });
          if (res.error) {
            throw res.error;
          }

          if (!res.data) {
            throw new Error('No data while fetching enrollment API keys');
          }

          setEnrollmentAPIKeys(
            res.data.list.filter((key) => key.policy_id === agentPolicyId && key.active === true)
          );
        } catch (error) {
          notifications.toasts.addError(error, {
            title: 'Error',
          });
        }
      }
      fetchEnrollmentAPIKeys();
    },
    [agentPolicyId, notifications.toasts]
  );

  useEffect(
    function useDefaultEnrollmentKeyForAgentPolicyEffect() {
      if (
        !selectedEnrollmentApiKey &&
        enrollmentAPIKeys.length > 0 &&
        enrollmentAPIKeys[0].policy_id === agentPolicyId
      ) {
        const enrollmentAPIKeyId = enrollmentAPIKeys[0].id;
        setSelectedEnrollmentApiKey(enrollmentAPIKeyId);
      }
    },
    [enrollmentAPIKeys, selectedEnrollmentApiKey, agentPolicyId]
  );
  return (
    <>
      <EuiButtonEmpty
        flush="left"
        iconType={isAuthenticationSettingsOpen ? 'arrowDown' : 'arrowRight'}
        onClick={() => setIsAuthenticationSettingsOpen(!isAuthenticationSettingsOpen)}
      >
        <FormattedMessage
          id="xpack.fleet.enrollmentStepAgentPolicy.showAuthenticationSettingsButton"
          defaultMessage="Authentication settings"
        />
      </EuiButtonEmpty>
      {isAuthenticationSettingsOpen && (
        <>
          <EuiSpacer size="m" />
          {enrollmentAPIKeys.length && selectedEnrollmentApiKey ? (
            <EuiSelect
              fullWidth
              options={enrollmentAPIKeys.map((key) => ({
                value: key.id,
                text: key.name,
              }))}
              value={selectedEnrollmentApiKey || undefined}
              prepend={
                <EuiText>
                  <FormattedMessage
                    id="xpack.fleet.enrollmentStepAgentPolicy.enrollmentTokenSelectLabel"
                    defaultMessage="Enrollment token"
                  />
                </EuiText>
              }
              onChange={(e) => {
                setSelectedEnrollmentApiKey(e.target.value);
              }}
            />
          ) : (
            <EuiCallOut
              color="warning"
              title={i18n.translate(
                'xpack.fleet.enrollmentStepAgentPolicy.noEnrollmentTokensForSelectedPolicyCallout',
                {
                  defaultMessage: 'There are no enrollment tokens for the selected agent policy',
                }
              )}
            >
              <div className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.fleet.agentEnrenrollmentStepAgentPolicyollment.noEnrollmentTokensForSelectedPolicyCalloutDescription"
                  defaultMessage="You must create and enrollment token in order to enroll agents with this policy"
                />
              </div>
              <EuiSpacer size="m" />
              <EuiButton
                iconType="plusInCircle"
                isLoading={isLoadingEnrollmentKey}
                fill
                onClick={onCreateEnrollmentTokenClick}
              >
                <FormattedMessage
                  id="xpack.fleet.enrollmentStepAgentPolicy.setUpAgentsLink"
                  defaultMessage="Create enrollment token"
                />
              </EuiButton>
            </EuiCallOut>
          )}
        </>
      )}
    </>
  );
};
