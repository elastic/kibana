/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer, EuiSteps, EuiStep, EuiStepStatus } from '@elastic/eui';
import { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useMutation } from 'react-query';

import { UseField, Form, useForm, useFormData } from '../../shared_imports';
import { AgentsTableField } from './agents_table_field';
import { LiveQueryQueryField } from './live_query_query_field';
import { useKibana } from '../../common/lib/kibana';
import { ResultTabs } from '../../queries/edit/tabs';

const FORM_ID = 'liveQueryForm';

interface LiveQueryFormProps {
  defaultValue?: unknown;
  onSubmit?: (payload: Record<string, string>) => Promise<void>;
  onSuccess?: () => void;
}

const LiveQueryFormComponent: React.FC<LiveQueryFormProps> = ({
  defaultValue,
  onSubmit,
  onSuccess,
}) => {
  const { http } = useKibana().services;

  const { data, isLoading, mutateAsync, isError, isSuccess, error } = useMutation(
    (payload: Record<string, unknown>) =>
      http.post('/internal/osquery/action', {
        body: JSON.stringify(payload),
      }),
    {
      onSuccess,
    }
  );

  const { form } = useForm({
    id: FORM_ID,
    // schema: formSchema,
    onSubmit: (payload) => {
      // console.error('payload', payload, isValid);
      return mutateAsync(payload);
    },
    options: {
      stripEmptyFields: false,
    },
    defaultValue: {
      query: defaultValue ?? {
        id: null,
        query: '',
      },
    },
  });

  const { submit } = form;

  const actionId = useMemo(() => data?.actions[0].action_id, [data?.actions]);

  const [{ agentSelection, query }] = useFormData({ form, watch: ['agentSelection', 'query'] });

  const agentSelected = useMemo(
    () =>
      !!(
        agentSelection?.agents?.length ||
        agentSelection?.allAgentsSelected ||
        agentSelection?.platformsSelected?.length ||
        agentSelection?.policiesSelected?.length
      ),
    [agentSelection]
  );

  const queryValueProvided = useMemo(() => !!query?.query?.length, [query]);

  const queryStatus = useMemo(() => {
    if (!agentSelected) return 'disabled';
    if (!queryValueProvided) return 'incomplete';

    return 'complete';
  }, [agentSelected, queryValueProvided]);

  const submitQueryStatus = useMemo(() => {
    if (!agentSelected || !queryValueProvided) return 'disabled';
    if (isError) return 'danger';
    if (isLoading) return 'loading';
    if (isSuccess) return 'complete';
    return 'incomplete';
  }, [agentSelected, isError, isLoading, isSuccess, queryValueProvided]);

  const resultsStatus = useMemo(
    () => (submitQueryStatus === 'complete' ? 'incomplete' : 'disabled'),
    [submitQueryStatus]
  );

  const formSteps: EuiContainedStepProps[] = useMemo(
    () => [
      {
        title: i18n.translate('xpack.osquery.liveQueryForm.steps.agentsStepHeading', {
          defaultMessage: 'Select agents',
        }),
        children: <UseField path="agents" component={AgentsTableField} />,
        status: agentSelected ? 'complete' : 'incomplete',
      },
      {
        title: i18n.translate('xpack.osquery.liveQueryForm.steps.queryStepHeading', {
          defaultMessage: 'Enter query',
        }),
        children: (
          <UseField
            path="query"
            component={LiveQueryQueryField}
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            componentProps={{
              disabled: queryStatus === 'disabled',
            }}
          />
        ),
        status: queryStatus,
      },
      {
        title: i18n.translate('xpack.osquery.liveQueryForm.steps.runStepHeading', {
          defaultMessage: 'Submit query',
        }),
        children: (
          <EuiButton disabled={submitQueryStatus === 'disabled'} onClick={submit}>
            {'Send query'}
          </EuiButton>
        ),
        status: submitQueryStatus,
      },
      {
        title: i18n.translate('xpack.osquery.liveQueryForm.steps.resultsStepHeading', {
          defaultMessage: 'Check results',
        }),
        children: actionId ? <ResultTabs actionId={actionId} /> : <></>,
        status: resultsStatus,
      },
    ],
    [actionId, agentSelected, queryStatus, resultsStatus, submit, submitQueryStatus]
  );

  return (
    <Form form={form}>
      <EuiSteps steps={formSteps} />
    </Form>
  );
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);
