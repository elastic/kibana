/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiTitle, EuiSpacer, EuiText, EuiSplitPanel } from '@elastic/eui';
import { loadAllActions as loadConnectors } from '../../lib/action_connector_api';
import { ActionConnector } from '../../../types';
import { SectionLoading } from '../../components/section_loading';
import { useKibana } from '../../../common/lib/kibana';
import { InitialRule } from '../rule_form/rule_reducer';
import { NotificationPolicyWithId } from '../notifications_list/components/create_notification_policy_modal';
import { getAllPolicies } from '../../lib/notification_api/get_all_policies';
import NotificationPolicy from '../notifications_list/components/notification_policy';

export interface NotificationFormProps {
  rule: InitialRule;
}

export const NotificationForm = ({ rule }: NotificationFormProps) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [policies, setPolicies] = useState<NotificationPolicyWithId[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState<boolean>(false);
  const [connectors, setConnectors] = useState<ActionConnector[]>([]);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState<boolean>(false);
  const [matchingPolicies, setMatchingPolicies] = useState<NotificationPolicyWithId[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingPolicies(true);
        setPolicies(await getAllPolicies({ http }));
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.notificationForm.unableToLoadPoliciesMessage',
            { defaultMessage: 'Unable to load notification policies' }
          ),
        });
      } finally {
        setIsLoadingPolicies(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load connectors
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingConnectors(true);
        const loadedConnectors = await loadConnectors({ http, includeSystemActions: true });
        setConnectors(
          loadedConnectors.filter(
            (connector) => !connector.isMissingSecrets || connector.isSystemAction
          )
        );
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.actionForm.unableToLoadActionsMessage',
            {
              defaultMessage: 'Unable to load connectors',
            }
          ),
        });
      } finally {
        setIsLoadingConnectors(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // find matching policies
    const match = [];
    for (const policy of policies) {
      const conditionMatch: boolean[] = [];
      for (const policyCondition of policy.conditions) {
        switch (policyCondition.type) {
          case 'active_action_group':
            if (
              policyCondition.value.includes('all') ||
              policyCondition.value.includes(rule.ruleTypeId ?? '')
            ) {
              conditionMatch.push(true);
            }
            break;
          case 'recovered_action_group':
            if (
              policyCondition.value.includes('all') ||
              policyCondition.value.includes(rule.ruleTypeId ?? '')
            ) {
              conditionMatch.push(true);
            }
            break;
          case 'tags':
            if (rule.tags?.length > 0) {
              for (const val of policyCondition.value) {
                const tagRegex = new RegExp(val);
                for (const tag of rule.tags) {
                  if (tagRegex.test(tag)) {
                    conditionMatch.push(true);
                    break;
                  }
                }
              }
            }
            break;
          case 'name':
            for (const val of policyCondition.value) {
              const nameRegex = new RegExp(val);
              if (nameRegex.test(rule.name ?? '')) {
                conditionMatch.push(true);
                break;
              }
            }
            break;
        }
      }

      if (conditionMatch.length === policy.conditions.length) {
        match.push(policy);
      }
    }

    setMatchingPolicies(match);
  }, [rule, policies]);

  return isLoadingConnectors || isLoadingPolicies ? (
    <SectionLoading>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.notificationForm.loadingDescription"
        defaultMessage="Loading..."
      />
    </SectionLoading>
  ) : (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage
            defaultMessage="Notification policies"
            id="xpack.triggersActionsUI.sections.notificationForm.sectionsTitle"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      {matchingPolicies.length === 0 && (
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              defaultMessage="No matching notification policies"
              id="xpack.triggersActionsUI.sections.notificationForm.noMatchingPoliciesTitle"
            />
          </h5>
        </EuiTitle>
      )}
      {matchingPolicies.length > 0 && (
        <>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                defaultMessage="{numMatching} matching notification {numMatching, plural, one {policy} other {policies}}"
                id="xpack.triggersActionsUI.sections.notificationForm.numMatchingPoliciesTitle"
                values={{ numMatching: matchingPolicies.length }}
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          {matchingPolicies.map((policy) => {
            return (
              <>
                <EuiSplitPanel.Outer>
                  <EuiSplitPanel.Inner grow={false} color="subdued">
                    <EuiText>
                      <p>{policy.name}</p>
                    </EuiText>
                  </EuiSplitPanel.Inner>
                  <EuiSplitPanel.Inner>
                    <EuiFlexGroup wrap gutterSize="xs" direction="column">
                      <NotificationPolicy policy={policy} connectors={connectors} />
                    </EuiFlexGroup>
                  </EuiSplitPanel.Inner>
                </EuiSplitPanel.Outer>
                <EuiSpacer size="m" />
              </>
            );
          })}
        </>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { NotificationForm as default };
