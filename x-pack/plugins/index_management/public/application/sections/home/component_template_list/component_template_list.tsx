/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { RouteComponentProps } from 'react-router-dom';
import { SectionLoading } from '../../../../shared_imports';
import { useLoadComponentTemplates } from '../../../services/api';
import { useServices } from '../../../app_context';
import { EmptyPrompt } from './empty_prompt';
import { ComponentTable } from './table';

interface MatchParams {
  templateName?: string;
}

export const ComponentTemplateList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { templateName },
  },
  location,
  history,
}) => {
  const { uiMetricService } = useServices();

  const { data, isLoading, error, sendRequest } = useLoadComponentTemplates();

  // Track component loaded
  // useEffect(() => {
  //   uiMetricService.trackMetric('loaded', UIM_TEMPLATE_LIST_LOAD);
  // }, [uiMetricService]);

  if (data?.length === 0) {
    return <EmptyPrompt />;
  }

  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <SectionLoading data-test-subj="sectionLoading">
        <FormattedMessage
          id="xpack.idxMgmt.home.componentTemplates.list.loadingMessage"
          defaultMessage="Loading component templates..."
        />
      </SectionLoading>
    );
  } else if (data?.length) {
    content = <ComponentTable componentTemplates={data} onReloadClick={sendRequest} />;
  }

  return <div data-test-subj="componentTemplateList">{content}</div>;
};
