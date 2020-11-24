/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { isColorDark, hexToRgb } from '@elastic/eui';
import classNames from 'classnames';
import { useValues } from 'kea';

import { DisplaySettingsLogic } from './display_settings_logic';

import { CustomSourceIcon } from './custom_source_icon';
import { SubtitleField } from './subtitle_field';
import { TitleField } from './title_field';

export const ExampleSearchResultGroup: React.FC = () => {
  const {
    sourceName,
    searchResultConfig: { titleField, subtitleField, descriptionField, color },
    titleFieldHover,
    subtitleFieldHover,
    descriptionFieldHover,
    exampleDocuments,
  } = useValues(DisplaySettingsLogic);

  return (
    <div className="example-result-group">
      <div className="example-result-group__header" style={{ backgroundColor: color }}>
        <CustomSourceIcon color={isColorDark.apply(null, hexToRgb(color)) ? 'white' : 'black'} />
        <span
          className="example-result-group__source-name"
          style={{ color: isColorDark.apply(null, hexToRgb(color)) ? 'white' : 'black' }}
        >
          {sourceName}
        </span>
      </div>
      <div className="example-result-group__content">
        <div className="example-result-group__border" style={{ backgroundColor: color }} />
        <div className="example-result-group__results">
          {exampleDocuments.map((result, id) => (
            <div key={id} className="example-grouped-result">
              <div className="example-result-content">
                <TitleField
                  titleFieldHover={titleFieldHover}
                  titleField={titleField}
                  result={result}
                />
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
                    <div>{result[descriptionField]}</div>
                  ) : (
                    <span className="example-result-content-placeholder">Description</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
