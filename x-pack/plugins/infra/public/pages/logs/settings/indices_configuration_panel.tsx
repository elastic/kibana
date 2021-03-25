/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FieldsConfigurationPanel } from './fields_configuration_panel';
import { FormElementProps, isFormElementPropsForType } from './form_elements';
import { IndexNamesConfigurationPanel } from './index_names_configuration_panel';
import { IndexPatternConfigurationPanel } from './index_pattern_configuration_panel';
import { LogIndexNameReference, LogIndexPatternReference, LogIndexReference } from './types';

export const IndicesConfigurationPanel: React.FC<{
  isLoading: boolean;
  isReadOnly: boolean;
  indicesFormElementProps: FormElementProps<LogIndexReference | undefined>;
  tiebreakerFieldFormElementProps: FormElementProps<string>;
  timestampFieldFormElementProps: FormElementProps<string>;
}> = ({
  isLoading,
  isReadOnly,
  indicesFormElementProps,
  tiebreakerFieldFormElementProps,
  timestampFieldFormElementProps,
}) => {
  const switchToIndexPatternReference = useCallback(() => {
    indicesFormElementProps.onChange?.(undefined);
  }, [indicesFormElementProps]);

  if (
    isUndefinedFormElementProps(indicesFormElementProps) ||
    isIndexPatternFormElementProps(indicesFormElementProps)
  ) {
    return (
      <IndexPatternConfigurationPanel
        isLoading={isLoading}
        isReadOnly={isReadOnly}
        indexPatternFormElementProps={indicesFormElementProps}
      />
    );
  } else if (isIndexNamesFormElementProps(indicesFormElementProps)) {
    return (
      <>
        <IndexNamesConfigurationPanel
          isLoading={isLoading}
          isReadOnly={isReadOnly}
          indexNamesFormElementProps={indicesFormElementProps}
          onSwitchToIndexPatternReference={switchToIndexPatternReference}
        />
        <FieldsConfigurationPanel
          isLoading={isLoading}
          isReadOnly={isReadOnly}
          tiebreakerFieldFormElementProps={tiebreakerFieldFormElementProps}
          timestampFieldFormElementProps={timestampFieldFormElementProps}
        />
      </>
    );
  } else {
    return null;
  }
};

const isUndefinedFormElementProps = isFormElementPropsForType(
  (value): value is undefined => value == null
);

const isIndexPatternFormElementProps = isFormElementPropsForType(
  (value): value is LogIndexPatternReference => value?.type === 'index-pattern'
);

const isIndexNamesFormElementProps = isFormElementPropsForType(
  (value): value is LogIndexNameReference => value?.type === 'index-name'
);
