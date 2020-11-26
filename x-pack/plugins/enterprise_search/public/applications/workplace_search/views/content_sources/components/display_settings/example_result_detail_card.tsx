/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import classNames from 'classnames';
import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { DisplaySettingsLogic } from './display_settings_logic';

import { CustomSourceIcon } from './custom_source_icon';
import { TitleField } from './title_field';

export const ExampleResultDetailCard: React.FC = () => {
  const {
    sourceName,
    searchResultConfig: { titleField, urlField, color, detailFields },
    titleFieldHover,
    urlFieldHover,
    exampleDocuments,
  } = useValues(DisplaySettingsLogic);

  const result = exampleDocuments[0];

  return (
    <div className="example-result-detail-card">
      <div className="example-result-detail-card__header">
        <div className="example-result-detail-card__border" style={{ backgroundColor: color }} />
        <div className="example-result-detail-card__source-name">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <CustomSourceIcon color={color} />
            </EuiFlexItem>
            <EuiFlexItem>{sourceName}</EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div className="example-result-content">
          <TitleField titleFieldHover={titleFieldHover} titleField={titleField} result={result} />
          <div
            className={classNames('example-result-content__url', {
              'example-result-field-hover': urlFieldHover,
            })}
          >
            {urlField ? (
              <div className="eui-textTruncate">{result[urlField]}</div>
            ) : (
              <span className="example-result-content-placeholder">URL</span>
            )}
          </div>
        </div>
      </div>
      <div className="example-result-detail-card__content">
        {detailFields.length > 0 ? (
          detailFields.map(({ fieldName, label }, index) => (
            <div className="example-result-detail-card__field" key={index}>
              <EuiTitle size="xs">
                <h4>{label}</h4>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                <div className="eui-textBreakWord">{result[fieldName]}</div>
              </EuiText>
            </div>
          ))
        ) : (
          <EuiSpacer size="m" />
        )}
      </div>
    </div>
  );
};
