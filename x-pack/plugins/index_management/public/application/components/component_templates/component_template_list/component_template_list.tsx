/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ScopedHistory } from 'kibana/public';

import { SectionLoading, ComponentTemplateDeserialized } from '../shared_imports';
import { UIM_COMPONENT_TEMPLATE_LIST_LOAD } from '../constants';
import { useComponentTemplatesContext } from '../component_templates_context';
import { ComponentTemplateDetailsFlyout } from '../component_template_details';
import { EmptyPrompt } from './empty_prompt';
import { ComponentTable } from './table';
import { LoadError } from './error';
import { ComponentTemplatesDeleteModal } from './delete_modal';

interface Props {
  componentTemplateName?: string;
  history: RouteComponentProps['history'];
}

export const ComponentTemplateList: React.FunctionComponent<Props> = ({
  componentTemplateName,
  history,
}) => {
  const { api, trackMetric } = useComponentTemplatesContext();

  const { data, isLoading, error, sendRequest } = api.useLoadComponentTemplates();

  const [componentTemplatesToDelete, setComponentTemplatesToDelete] = useState<string[]>([]);

  const goToList = () => {
    return history.push('component_templates');
  };

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
        history={history as ScopedHistory}
      />
    );
  } else if (error) {
    content = <LoadError onReloadClick={sendRequest} />;
  }

  return (
    <div data-test-subj="componentTemplateList">
      {content}

      {/* delete modal */}
      {componentTemplatesToDelete?.length > 0 ? (
        <ComponentTemplatesDeleteModal
          callback={(deleteResponse) => {
            if (deleteResponse?.hasDeletedComponentTemplates) {
              // refetch the component templates
              sendRequest();
              // go back to list view (if deleted from details flyout)
              goToList();
            }
            setComponentTemplatesToDelete([]);
          }}
          componentTemplatesToDelete={componentTemplatesToDelete}
        />
      ) : null}

      {/* details flyout */}
      {componentTemplateName && (
        <ComponentTemplateDetailsFlyout
          onClose={goToList}
          componentTemplateName={componentTemplateName}
          actions={[
            {
              name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.deleteButtonLabel', {
                defaultMessage: 'Delete',
              }),
              icon: 'trash',
              getIsDisabled: (details: ComponentTemplateDeserialized) =>
                details._kbnMeta.usedBy.length > 0,
              closePopoverOnClick: true,
              handleActionClick: () => {
                setComponentTemplatesToDelete([componentTemplateName]);
              },
            },
          ]}
        />
      )}
    </div>
  );
};
