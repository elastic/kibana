/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { ScopedHistory } from 'kibana/public';
import {
  EuiEmptyPrompt,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
  EuiLink,
} from '@elastic/eui';

import { UIM_TEMPLATE_LIST_LOAD } from '../../../../../common/constants';
import { TemplateListItem } from '../../../../../common';
import { SectionError, SectionLoading, Error } from '../../../components';
import { useLoadIndexTemplates } from '../../../services/api';
import { documentationService } from '../../../services/documentation';
import { useServices } from '../../../app_context';
import {
  getTemplateEditLink,
  getTemplateListLink,
  getTemplateCloneLink,
} from '../../../services/routing';
import { getIsLegacyFromQueryParams } from '../../../lib/index_templates';
import { TemplateTable } from './template_table';
import { TemplateDetails } from './template_details';
import { LegacyTemplateTable } from './legacy_templates/template_table';
import { FilterListButton, Filters } from './components';

type FilterName = 'composable' | 'system';
interface MatchParams {
  templateName?: string;
}

const stripOutSystemTemplates = (templates: TemplateListItem[]): TemplateListItem[] =>
  templates.filter((template) => !template.name.startsWith('.'));

export const TemplateList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { templateName },
  },
  location,
  history,
}) => {
  const { uiMetricService } = useServices();
  const { error, isLoading, data: allTemplates, sendRequest: reload } = useLoadIndexTemplates();

  const [filters, setFilters] = useState<Filters<FilterName>>({
    composable: {
      name: i18n.translate('xpack.idxMgmt.indexTemplatesList.viewComposableTemplateLabel', {
        defaultMessage: 'Composable templates',
      }),
      checked: 'on',
    },
    system: {
      name: i18n.translate('xpack.idxMgmt.indexTemplatesList.viewSystemTemplateLabel', {
        defaultMessage: 'System templates',
      }),
      checked: 'off',
    },
  });

  const filteredTemplates = useMemo(() => {
    if (!allTemplates) {
      return { templates: [], legacyTemplates: [] };
    }

    return filters.system.checked === 'on'
      ? allTemplates
      : {
          templates: stripOutSystemTemplates(allTemplates.templates),
          legacyTemplates: stripOutSystemTemplates(allTemplates.legacyTemplates),
        };
  }, [allTemplates, filters.system.checked]);

  const showComposableTemplateTable = filters.composable.checked === 'on';

  const selectedTemplate = Boolean(templateName)
    ? {
        name: templateName!,
        isLegacy: getIsLegacyFromQueryParams(location),
      }
    : null;

  const isTemplateDetailsVisible = selectedTemplate !== null;
  const hasTemplates =
    allTemplates && (allTemplates.legacyTemplates.length > 0 || allTemplates.templates.length > 0);

  const closeTemplateDetails = () => {
    history.push(getTemplateListLink());
  };

  const editTemplate = (name: string, isLegacy?: boolean) => {
    history.push(getTemplateEditLink(name, isLegacy));
  };

  const cloneTemplate = (name: string, isLegacy?: boolean) => {
    history.push(getTemplateCloneLink(name, isLegacy));
  };

  const renderHeader = () => (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={true}>
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.idxMgmt.home.indexTemplatesDescription"
            defaultMessage="Use index templates to automatically apply settings, mappings, and aliases to indices. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink
                  href={documentationService.getTemplatesDocumentationLink()}
                  target="_blank"
                  external
                >
                  {i18n.translate(
                    'xpack.idxMgmt.home.indexTemplatesDescription.learnMoreLinkText',
                    {
                      defaultMessage: 'Learn more.',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FilterListButton<FilterName> filters={filters} onChange={setFilters} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          color="secondary"
          iconType="refresh"
          onClick={reload}
          data-test-subj="reloadButton"
          key="reloadButton"
        >
          <FormattedMessage
            id="xpack.idxMgmt.templateList.table.reloadTemplatesButtonLabel"
            defaultMessage="Reload"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderTemplatesTable = () =>
    showComposableTemplateTable ? (
      <>
        <EuiSpacer size="l" />
        <TemplateTable
          templates={filteredTemplates.templates}
          reload={reload}
          editTemplate={editTemplate}
          cloneTemplate={cloneTemplate}
          history={history as ScopedHistory}
        />
      </>
    ) : null;

  const renderLegacyTemplatesTable = () => (
    <>
      <EuiSpacer size="xl" />
      <EuiTitle size="s">
        <h1>
          <FormattedMessage
            id="xpack.idxMgmt.home.legacyIndexTemplatesTitle"
            defaultMessage="Legacy index templates"
          />
        </h1>
      </EuiTitle>
      <EuiSpacer />
      <LegacyTemplateTable
        templates={filteredTemplates.legacyTemplates}
        reload={reload}
        editTemplate={editTemplate}
        cloneTemplate={cloneTemplate}
        history={history as ScopedHistory}
      />
    </>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <SectionLoading>
          <FormattedMessage
            id="xpack.idxMgmt.indexTemplatesList.loadingIndexTemplatesDescription"
            defaultMessage="Loading templates…"
          />
        </SectionLoading>
      );
    } else if (error) {
      return (
        <SectionError
          title={
            <FormattedMessage
              id="xpack.idxMgmt.indexTemplatesList.loadingIndexTemplatesErrorMessage"
              defaultMessage="Error loading templates"
            />
          }
          error={error as Error}
        />
      );
    } else if (!hasTemplates) {
      return (
        <EuiEmptyPrompt
          iconType="managementApp"
          title={
            <h1 data-test-subj="title">
              <FormattedMessage
                id="xpack.idxMgmt.indexTemplatesList.emptyPrompt.noIndexTemplatesTitle"
                defaultMessage="You don't have any templates yet"
              />
            </h1>
          }
          data-test-subj="emptyPrompt"
        />
      );
    } else {
      return (
        <Fragment>
          {/* Header */}
          {renderHeader()}

          {/* Composable index templates table */}
          {renderTemplatesTable()}

          {/* Legacy index templates table */}
          {renderLegacyTemplatesTable()}
        </Fragment>
      );
    }
  };

  // Track component loaded
  useEffect(() => {
    uiMetricService.trackMetric('loaded', UIM_TEMPLATE_LIST_LOAD);
  }, [uiMetricService]);

  return (
    <div data-test-subj="templateList">
      {renderContent()}

      {isTemplateDetailsVisible && (
        <TemplateDetails
          template={selectedTemplate!}
          onClose={closeTemplateDetails}
          editTemplate={editTemplate}
          cloneTemplate={cloneTemplate}
          reload={reload}
        />
      )}
    </div>
  );
};
