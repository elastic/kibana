/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { SectionLoading } from '../shared_imports';
import { useComponentTemplatesContext } from '../component_templates_context';
import { UIM_COMPONENT_TEMPLATE_LIST_LOAD } from '../constants';

import { EmptyPrompt } from './empty_prompt';
import { ComponentTable } from './table';
import { LoadError } from './error';
import { ComponentTemplatesDeleteModal } from './delete_modal';

export const ComponentTemplateList: React.FunctionComponent = () => {
  const { api, trackMetric } = useComponentTemplatesContext();

  const { data, isLoading, error, sendRequest } = api.useLoadComponentTemplates();

  const [componentTemplatesToDelete, setComponentTemplatesToDelete] = useState<string[]>([]);

  // Track component loaded
  useEffect(() => {
    trackMetric('loaded', UIM_COMPONENT_TEMPLATE_LIST_LOAD);
  }, [trackMetric]);

  if (data && data.length === 0) {
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
    content = (
      <ComponentTable
        componentTemplates={data}
        onReloadClick={sendRequest}
        onDeleteClick={setComponentTemplatesToDelete}
      />
    );
  } else if (error) {
    content = <LoadError onReloadClick={sendRequest} />;
  }

  return (
    <div data-test-subj="componentTemplateList">
      {content}
      {componentTemplatesToDelete?.length > 0 ? (
        <ComponentTemplatesDeleteModal
          callback={(deleteResponse) => {
            if (deleteResponse?.hasDeletedComponentTemplates) {
              // refetch the component templates
              sendRequest();
            }
            setComponentTemplatesToDelete([]);
          }}
          componentTemplatesToDelete={componentTemplatesToDelete}
        />
      ) : null}
    </div>
  );
};
