/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { FormattedMessage } from '@kbn/i18n-react';
import { ScopedHistory } from '@kbn/core/public';
import { EuiLink, EuiText, EuiSpacer } from '@elastic/eui';

import {
  APP_WRAPPER_CLASS,
  PageLoading,
  PageError,
  attemptToURIDecode,
} from '../../../../shared_imports';
import { ComponentTemplateDeserialized, GlobalFlyout } from '../shared_imports';
import { UIM_COMPONENT_TEMPLATE_LIST_LOAD } from '../constants';
import { useComponentTemplatesContext } from '../component_templates_context';
import {
  ComponentTemplateDetailsFlyoutContent,
  defaultFlyoutProps,
  ComponentTemplateDetailsProps,
} from '../component_template_details';
import { EmptyPrompt } from './empty_prompt';
import { ComponentTable } from './table';
import { ComponentTemplatesDeleteModal } from './delete_modal';

interface Props {
  componentTemplateName?: string;
  history: RouteComponentProps['history'];
}

const { useGlobalFlyout } = GlobalFlyout;

export const ComponentTemplateList: React.FunctionComponent<Props> = ({
  componentTemplateName,
  history,
}) => {
  const { addContent: addContentToGlobalFlyout, removeContent: removeContentFromGlobalFlyout } =
    useGlobalFlyout();
  const { api, trackMetric, documentation } = useComponentTemplatesContext();

  const { data, isLoading, error, resendRequest } = api.useLoadComponentTemplates();

  const [componentTemplatesToDelete, setComponentTemplatesToDelete] = useState<string[]>([]);

  const goToComponentTemplateList = useCallback(() => {
    return history.push({
      pathname: 'component_templates',
    });
  }, [history]);

  const goToEditComponentTemplate = useCallback(
    (name: string) => {
      return history.push({
        pathname: encodeURI(`edit_component_template/${encodeURIComponent(name)}`),
      });
    },
    [history]
  );

  const goToCloneComponentTemplate = useCallback(
    (name: string) => {
      return history.push({
        pathname: encodeURI(`create_component_template/${encodeURIComponent(name)}`),
      });
    },
    [history]
  );

  // Track component loaded
  useEffect(() => {
    trackMetric(METRIC_TYPE.LOADED, UIM_COMPONENT_TEMPLATE_LIST_LOAD);
  }, [trackMetric]);

  useEffect(() => {
    if (componentTemplateName) {
      const actions = [
        {
          name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.editButtonLabel', {
            defaultMessage: 'Edit',
          }),
          icon: 'pencil',
          handleActionClick: () =>
            goToEditComponentTemplate(attemptToURIDecode(componentTemplateName)!),
        },
        {
          name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.cloneActionLabel', {
            defaultMessage: 'Clone',
          }),
          icon: 'copy',
          handleActionClick: () =>
            goToCloneComponentTemplate(attemptToURIDecode(componentTemplateName)!),
        },
        {
          name: i18n.translate('xpack.idxMgmt.componentTemplateDetails.deleteButtonLabel', {
            defaultMessage: 'Delete',
          }),
          icon: 'trash',
          getIsDisabled: (details: ComponentTemplateDeserialized) =>
            details._kbnMeta.usedBy.length > 0,
          closePopoverOnClick: true,
          handleActionClick: () => {
            setComponentTemplatesToDelete([attemptToURIDecode(componentTemplateName)!]);
          },
        },
      ];

      // Open the flyout with the Component Template Details content
      addContentToGlobalFlyout<ComponentTemplateDetailsProps>({
        id: 'componentTemplateDetails',
        Component: ComponentTemplateDetailsFlyoutContent,
        props: {
          onClose: goToComponentTemplateList,
          componentTemplateName,
          showSummaryCallToAction: true,
          actions,
        },
        flyoutProps: { ...defaultFlyoutProps, onClose: goToComponentTemplateList },
      });
    }
  }, [
    componentTemplateName,
    goToComponentTemplateList,
    goToEditComponentTemplate,
    goToCloneComponentTemplate,
    addContentToGlobalFlyout,
    history,
  ]);

  useEffect(() => {
    if (!componentTemplateName) {
      removeContentFromGlobalFlyout('componentTemplateDetails');
    }
  }, [componentTemplateName, removeContentFromGlobalFlyout]);

  if (isLoading) {
    return (
      <PageLoading data-test-subj="sectionLoading">
        <FormattedMessage
          id="xpack.idxMgmt.home.componentTemplates.list.loadingMessage"
          defaultMessage="Loading component templates…"
        />
      </PageLoading>
    );
  }

  let content: React.ReactNode;

  if (data?.length) {
    content = (
      <>
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.idxMgmt.home.componentTemplates.list.componentTemplatesDescription"
            defaultMessage="Use component templates to reuse settings, mappings, and aliases configurations in multiple index templates. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink href={documentation.componentTemplates} target="_blank" external>
                  {i18n.translate('xpack.idxMgmt.componentTemplates.list.learnMoreLinkText', {
                    defaultMessage: 'Learn more.',
                  })}
                </EuiLink>
              ),
            }}
          />
        </EuiText>

        <EuiSpacer />

        <ComponentTable
          componentTemplates={data}
          onReloadClick={resendRequest}
          onDeleteClick={setComponentTemplatesToDelete}
          onEditClick={goToEditComponentTemplate}
          onCloneClick={goToCloneComponentTemplate}
          history={history as ScopedHistory}
        />
      </>
    );
  } else if (data && data.length === 0) {
    content = <EmptyPrompt history={history} />;
  } else if (error) {
    content = (
      <PageError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.home.componentTemplates.list.loadingErrorMessage"
            defaultMessage="Error loading component templates"
          />
        }
        error={error}
        data-test-subj="componentTemplatesLoadError"
      />
    );
  }

  return (
    <div className={APP_WRAPPER_CLASS} data-test-subj="componentTemplateList">
      {content}

      {/* delete modal */}
      {componentTemplatesToDelete?.length > 0 ? (
        <ComponentTemplatesDeleteModal
          callback={(deleteResponse) => {
            if (deleteResponse?.hasDeletedComponentTemplates) {
              // refetch the component templates
              resendRequest();
              // go back to list view (if deleted from details flyout)
              goToComponentTemplateList();
            }
            setComponentTemplatesToDelete([]);
          }}
          componentTemplatesToDelete={componentTemplatesToDelete}
        />
      ) : null}
    </div>
  );
};
