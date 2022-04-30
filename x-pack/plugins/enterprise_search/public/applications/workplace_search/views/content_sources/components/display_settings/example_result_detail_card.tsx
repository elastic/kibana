/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';
import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { URL_LABEL } from '../../../../constants';

import { CustomSourceIcon } from './custom_source_icon';
import { DisplaySettingsLogic } from './display_settings_logic';
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
    <div className="example-result-detail-card" data-test-subj="ExampleResultDetailCard">
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
              <span className="example-result-content-placeholder" data-test-subj="DefaultUrlLabel">
                {URL_LABEL}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="example-result-detail-card__content">
        {detailFields.length > 0 ? (
          detailFields.map(({ fieldName, label }, index) => {
            const value = result[fieldName];

            return (
              <div
                className="example-result-detail-card__field"
                key={index}
                data-test-subj="DetailField"
              >
                <EuiTitle size="xs">
                  <h4>{label}</h4>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  <div className="eui-textBreakWord">{value}</div>
                </EuiText>
              </div>
            );
          })
        ) : (
          <EuiSpacer size="m" />
        )}
      </div>
    </div>
  );
};
