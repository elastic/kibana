/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import classNames from 'classnames';
import { useValues } from 'kea';

import { isColorDark, hexToRgb } from '@elastic/eui';

import { DisplaySettingsLogic } from './DisplaySettingsLogic';

import { CustomSourceIcon } from './CustomSourceIcon';
import { SubtitleField } from './SubtitleField';
import { TitleField } from './TitleField';

export const ExampleStandoutResult: React.FC = () => {
  const {
    sourceName,
    searchResultConfig: { titleField, subtitleField, descriptionField, color },
    titleFieldHover,
    subtitleFieldHover,
    descriptionFieldHover,
    exampleDocuments,
  } = useValues(DisplaySettingsLogic);

  const result = exampleDocuments[0];

  return (
    <div className="example-standout-result">
      <div className="example-standout-result__header" style={{ backgroundColor: color }}>
        <CustomSourceIcon color={isColorDark.apply(null, hexToRgb(color)) ? 'white' : 'black'} />
        <span
          className="example-standout-result__source-name"
          style={{ color: isColorDark.apply(null, hexToRgb(color)) ? 'white' : 'black' }}
        >
          {sourceName}
        </span>
      </div>
      <div className="example-standout-result__content">
        <div className="example-result-content">
          <TitleField titleFieldHover={titleFieldHover} titleField={titleField} result={result} />
          <SubtitleField
            subtitleFieldHover={subtitleFieldHover}
            subtitleField={subtitleField}
            result={result}
          />
          <div
            className={classNames('example-result-content__description', {
              'example-result-field-hover': descriptionFieldHover,
            })}
          >
            {descriptionField ? (
              <span>{result[descriptionField]}</span>
            ) : (
              <span className="example-result-content-placeholder">Description</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
