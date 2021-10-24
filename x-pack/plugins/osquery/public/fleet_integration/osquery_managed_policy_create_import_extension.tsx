/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty, unset, set } from 'lodash';
import satisfies from 'semver/functions/satisfies';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCallOut,
  EuiLink,
  EuiAccordion,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { produce } from 'immer';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
import styled from 'styled-components';

import {
  agentRouteService,
  agentPolicyRouteService,
  AgentPolicy,
  PLUGIN_ID,
} from '../../../fleet/common';
import {
  pagePathGetters,
  PackagePolicyCreateExtensionComponentProps,
  PackagePolicyEditExtensionComponentProps,
} from '../../../fleet/public';
import { useKibana } from '../common/lib/kibana';
import { NavigationButtons } from './navigation_buttons';
import { DisabledCallout } from './disabled_callout';
import { ConfigUploader } from './config_uploader';
import {
  Form,
  useForm,
  useFormData,
  Field,
  getUseField,
  FIELD_TYPES,
  fieldValidators,
} from '../shared_imports';

const CommonUseField = getUseField({ component: Field });

const StyledEuiAccordion = styled(EuiAccordion)`
  .euiAccordion__button {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }
`;

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */

export const OsqueryManagedPolicyCreateImportExtension = React.memo<
  PackagePolicyCreateExtensionComponentProps & {
    policy?: PackagePolicyEditExtensionComponentProps['policy'];
  }
>(({ onChange, policy, newPolicy }) => {
  const [policyAgentsCount, setPolicyAgentsCount] = useState<number | null>(null);
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy | null>(null);
  const [editMode] = useState(!!policy);
  const {
    application: { getUrlForApp },
    http,
  } = useKibana().services;

  const { form: configForm } = useForm({
    defaultValue: {
      config: JSON.stringify(get(newPolicy, 'inputs[0].config.osquery.value', {}), null, 2),
    },
    serializer: (formData) => {
      let config;
      try {
        // @ts-expect-error update types
        config = JSON.parse(formData.config);
      } catch (e) {
        config = {};
      }
      return { config };
    },
    schema: {
      config: {
        label: i18n.translate('xpack.osquery.fleetIntegration.osqueryConfig.configFieldLabel', {
          defaultMessage: 'Osquery config',
        }),
        type: FIELD_TYPES.JSON,
        validations: [
          {
            validator: fieldValidators.isJsonField(
              i18n.translate('xpack.osquery.fleetIntegration.osqueryConfig.configFieldError', {
                defaultMessage: 'Invalid JSON',
              }),
              { allowEmptyString: true }
            ),
          },
        ],
      },
    },
  });

  const [{ config }] = useFormData({ form: configForm, watch: 'config' });
  const { isValid, setFieldValue } = configForm;

  const agentsLinkHref = useMemo(() => {
    if (!policy?.policy_id) return '#';

    return getUrlForApp(PLUGIN_ID, {
      path: pagePathGetters.policy_details({ policyId: policy?.policy_id })[1],
    });
  }, [getUrlForApp, policy?.policy_id]);

  const handleConfigUpload = useCallback(
    (newConfig) => {
      let currentPacks = {};
      try {
        currentPacks = JSON.parse(config)?.packs;
        // eslint-disable-next-line no-empty
      } catch (e) {}

      if (newConfig) {
        setFieldValue(
          'config',
          JSON.stringify(
            {
              ...newConfig,
              ...(currentPacks ? { packs: currentPacks } : {}),
            },
            null,
            2
          )
        );
      }
    },
    [config, setFieldValue]
  );

  useDebounce(
    () => {
      // if undefined it means that config was not modified
      if (isValid === undefined) return;

      const updatedPolicy = produce(newPolicy, (draft) => {
        if (isEmpty(config)) {
          unset(draft, 'inputs[0].config');
        } else {
          set(draft, 'inputs[0].config.osquery.value', config);
        }
        return draft;
      });

      onChange({ isValid: !!isValid, updatedPolicy: isValid ? updatedPolicy : newPolicy });
    },
    500,
    [isValid, config]
  );

  useEffect(() => {
    if (editMode && policyAgentsCount === null) {
      const fetchAgentsCount = async () => {
        try {
          const response = await http.fetch(agentRouteService.getStatusPath(), {
            query: {
              policyId: policy?.policy_id,
            },
          });
          if (response.results) {
            setPolicyAgentsCount(response.results.total);
          }
          // eslint-disable-next-line no-empty
        } catch (e) {}
      };

      const fetchAgentPolicyDetails = async () => {
        if (policy?.policy_id) {
          try {
            const response = await http.fetch(
              agentPolicyRouteService.getInfoPath(policy?.policy_id)
            );
            if (response.item) {
              setAgentPolicy(response.item);
            }
            // eslint-disable-next-line no-empty
          } catch (e) {}
        }
      };

      fetchAgentsCount();
      fetchAgentPolicyDetails();
    }
  }, [editMode, http, policy?.policy_id, policyAgentsCount]);

  useEffect(() => {
    /*
      by default Fleet set up streams with an empty scheduled query,
      this code removes that, so the user can schedule queries
      in the next step
    */
    if (newPolicy?.package?.version) {
      if (!editMode && satisfies(newPolicy?.package?.version, '<0.6.0')) {
        const updatedPolicy = produce(newPolicy, (draft) => {
          set(draft, 'inputs[0].streams', []);
        });
        onChange({
          isValid: true,
          updatedPolicy,
        });
      }

      /* From 0.6.0 we don't provide an input template, so we have to set it here */
      if (satisfies(newPolicy?.package?.version, '>=0.6.0')) {
        const updatedPolicy = produce(newPolicy, (draft) => {
          if (!draft.inputs.length) {
            set(draft, 'inputs[0]', {
              type: 'osquery',
              enabled: true,
              streams: [],
              policy_template: 'osquery_manager',
            });
          }
        });
        onChange({
          isValid: true,
          updatedPolicy,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {!editMode ? <DisabledCallout /> : null}
      {policyAgentsCount === 0 ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut title="No agents in the policy" color="warning" iconType="help">
                <p>
                  {`Fleet has detected that you have not assigned yet any agent to the `}
                  {
                    <EuiLink href={agentsLinkHref}>
                      {agentPolicy?.name ?? policy?.policy_id}
                    </EuiLink>
                  }
                  {`. `}
                  <br />
                  <strong>{`Only agents within the policy with active Osquery Manager integration support the functionality presented below.`}</strong>
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
        </>
      ) : null}

      <NavigationButtons isDisabled={!editMode} agentPolicyId={policy?.policy_id} />
      <EuiSpacer size="xxl" />
      <StyledEuiAccordion
        id="advanced"
        buttonContent={i18n.translate(
          'xpack.osquery.fleetIntegration.osqueryConfig.accordionFieldLabel',
          {
            defaultMessage: 'Advanced',
          }
        )}
      >
        <EuiSpacer size="xs" />
        <Form form={configForm}>
          <CommonUseField path="config" />
          <ConfigUploader onChange={handleConfigUpload} />
        </Form>
      </StyledEuiAccordion>
    </>
  );
});

OsqueryManagedPolicyCreateImportExtension.displayName = 'OsqueryManagedPolicyCreateImportExtension';
