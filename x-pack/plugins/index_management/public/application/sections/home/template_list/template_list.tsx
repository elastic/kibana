/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiEmptyPrompt,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiSwitch,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
} from '@elastic/eui';

import { BASE_PATH, UIM_TEMPLATE_LIST_LOAD } from '../../../../../common/constants';
import { IndexTemplateFormatVersion } from '../../../../../common';
import { SectionError, SectionLoading, Error, ComponentTemplatesFlyout } from '../../../components';
import { useLoadIndexTemplates } from '../../../services/api';
import { useServices } from '../../../app_context';
import {
  getTemplateEditLink,
  getTemplateListLink,
  getTemplateCloneLink,
} from '../../../services/routing';
import { getFormatVersionFromQueryparams } from '../../../lib/index_templates';
import { TemplateTable } from './template_table';
import { TemplateDetails } from './template_details';

interface MatchParams {
  templateName?: string;
}

export const TemplateList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { templateName },
  },
  location,
  history,
}) => {
  const { uiMetricService } = useServices();
  const { error, isLoading, data: templates, sendRequest: reload } = useLoadIndexTemplates();
  const [isComponentTemplatesVisible, setIsComponentTemplatesVisible] = useState(false);
  const queryParamsFormatVersion = getFormatVersionFromQueryparams(location);
  const isTemplateDetailsVisible = templateName && queryParamsFormatVersion !== undefined;

  let content;

  const [showSystemTemplates, setShowSystemTemplates] = useState<boolean>(false);

  // Filter out system index templates
  const filteredTemplates = useMemo(
    () => (templates ? templates.filter(template => !template.name.startsWith('.')) : []),
    [templates]
  );

  const closeTemplateDetails = () => {
    history.push(getTemplateListLink());
  };

  const editTemplate = (name: string, formatVersion: IndexTemplateFormatVersion) => {
    history.push(getTemplateEditLink(name, formatVersion));
  };

  const cloneTemplate = (name: string, formatVersion: IndexTemplateFormatVersion) => {
    history.push(getTemplateCloneLink(name, formatVersion));
  };

  // Track component loaded
  useEffect(() => {
    uiMetricService.trackMetric('loaded', UIM_TEMPLATE_LIST_LOAD);
  }, [uiMetricService]);

  useEffect(() => {
    if (Boolean(templateName)) {
      setIsComponentTemplatesVisible(false);
    }
  }, [templateName]);

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexTemplatesList.loadingIndexTemplatesDescription"
          defaultMessage="Loading templates…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
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
  } else if (Array.isArray(templates) && templates.length === 0) {
    content = (
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
  } else if (Array.isArray(templates) && templates.length > 0) {
    content = (
      <Fragment>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <EuiTitle size="s">
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.idxMgmt.home.indexTemplatesDescription"
                  defaultMessage="Use index templates to automatically apply settings, mappings, and aliases to indices."
                />
              </EuiText>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              id="checkboxShowSystemIndexTemplates"
              data-test-subj="systemTemplatesSwitch"
              checked={showSystemTemplates}
              onChange={event => setShowSystemTemplates(event.target.checked)}
              label={
                <FormattedMessage
                  id="xpack.idxMgmt.indexTemplatesTable.systemIndexTemplatesSwitchLabel"
                  defaultMessage="Include system templates"
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <TemplateTable
          templates={showSystemTemplates ? templates : filteredTemplates}
          reload={reload}
          editTemplate={editTemplate}
          cloneTemplate={cloneTemplate}
        />
      </Fragment>
    );
  }

  return (
    <div data-test-subj="templateList">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={true}>
          <EuiTitle size="s">
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.idxMgmt.home.indexTemplatesDescription"
                defaultMessage="Use index templates to automatically apply settings, mappings, and aliases to indices."
              />
            </EuiText>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                color="secondary"
                iconType="apps"
                data-test-subj="componentsButton"
                key="components"
                onClick={() => setIsComponentTemplatesVisible(true)}
              >
                <FormattedMessage
                  id="xpack.idxMgmt.templateList.table.componentsButtonLabel"
                  defaultMessage="Components"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                href={`#${BASE_PATH}create_template`}
                fill
                iconType="plusInCircle"
                data-test-subj="createTemplateButton"
                key="createTemplateButton"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.templateList.table.createTemplatesButtonLabel"
                  defaultMessage="Create a template"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {content}
      {isTemplateDetailsVisible && (
        <TemplateDetails
          template={{
            name: templateName!,
            formatVersion: queryParamsFormatVersion!,
          }}
          onClose={closeTemplateDetails}
          editTemplate={editTemplate}
          cloneTemplate={cloneTemplate}
          reload={reload}
        />
      )}
      {isComponentTemplatesVisible && (
        <ComponentTemplatesFlyout onClose={() => setIsComponentTemplatesVisible(false)} />
      )}
    </div>
  );
};
