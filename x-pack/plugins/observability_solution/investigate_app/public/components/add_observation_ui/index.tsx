/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/css';
import { TextBasedLangEditor } from '@kbn/esql/public';
import { i18n } from '@kbn/i18n';
import { GlobalWidgetParameters, OnWidgetAdd } from '@kbn/investigate-plugin/public';
import React from 'react';
import { EsqlWidgetPreview } from './esql_widget_preview';

type Props = {
  onWidgetAdd: OnWidgetAdd;
} & GlobalWidgetParameters;

const emptyPreview = css`
  padding: 36px 0px 36px 0px;
`;

export function AddObservationUI({ onWidgetAdd, timeRange, filters }: Props) {
  const [isOpen, setIsOpen] = React.useState(false);

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [query, setQuery] = React.useState({ esql: '' });
  const [submittedQuery, setSubmittedQuery] = React.useState({ esql: '' });
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const resetState = () => {
    setIsExpanded(false);
    setIsPreviewOpen(false);
    setQuery({ esql: '' });
    setSubmittedQuery({ esql: '' });
  };

  if (!isOpen) {
    return (
      <EuiFlexGroup gutterSize="s" direction="row" alignItems="flexEnd">
        <EuiFlexItem grow={true}>
          <EuiButton
            data-test-subj="investigateAppAddObservationUIAddAnObservationChartButton"
            iconType="plusInCircle"
            onClick={() => setIsOpen(true)}
          >
            {i18n.translate(
              'xpack.investigateApp.addObservationUI.addAnObservationChartButtonLabel',
              { defaultMessage: 'Add an observation chart' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiPanel paddingSize="l" grow={false}>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={true}>
          <EuiTitle size="s">
            <h3>
              {i18n.translate(
                'xpack.investigateApp.addObservationUI.h2.addAnObservationChartLabel',
                { defaultMessage: 'Add an observation chart' }
              )}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiPanel color="subdued" hasShadow={false}>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <TextBasedLangEditor
                  query={query}
                  onTextLangQueryChange={setQuery}
                  onTextLangQuerySubmit={async (nextSubmittedQuery) => {
                    if (nextSubmittedQuery) {
                      setSubmittedQuery(nextSubmittedQuery);
                      setIsPreviewOpen(true);
                    }
                  }}
                  errors={undefined}
                  warning={undefined}
                  expandCodeEditor={(expanded: boolean) => {
                    setIsExpanded(() => expanded);
                  }}
                  isCodeEditorExpanded={isExpanded}
                  hideMinimizeButton={false}
                  editorIsInline={false}
                  hideRunQueryText
                  isLoading={false}
                  disableSubmitAction
                  isDisabled={false}
                  hideTimeFilterInfo
                />
              </EuiFlexItem>

              {!isPreviewOpen ? (
                <EuiFlexGroup
                  direction="column"
                  alignItems="center"
                  gutterSize="l"
                  className={emptyPreview}
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="image" size="xxl" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <p>
                      {i18n.translate(
                        'xpack.investigateApp.addObservationUI.p.selectADataSourceLabel',
                        { defaultMessage: 'Select a data source to generate a preview chart' }
                      )}
                    </p>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <EsqlWidgetPreview
                  filters={filters}
                  esqlQuery={submittedQuery.esql}
                  timeRange={timeRange}
                  onWidgetAdd={(widget) => {
                    resetState();
                    return onWidgetAdd(widget);
                  }}
                />
              )}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="text"
              data-test-subj="investigateAppAddObservationUICancelButton"
              onClick={() => {
                resetState();
                setIsOpen(false);
              }}
            >
              {i18n.translate('xpack.investigateApp.addObservationUI.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
