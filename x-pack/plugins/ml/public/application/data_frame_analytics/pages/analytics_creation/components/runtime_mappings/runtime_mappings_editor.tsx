/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';

import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { isRuntimeMappings } from '../../../../../../../common/util/runtime_field_utils';
import { XJsonModeType } from './runtime_mappings';

interface Props {
  convertToJson: (data: string) => string;
  setAdvancedRuntimeMappingsConfig: React.Dispatch<string>;
  setIsRuntimeMappingsEditorApplyButtonEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  advancedEditorRuntimeMappingsLastApplied: string | undefined;
  advancedRuntimeMappingsConfig: string;
  xJsonMode: XJsonModeType;
}

export const RuntimeMappingsEditor: FC<Props> = memo(
  ({
    convertToJson,
    xJsonMode,
    setAdvancedRuntimeMappingsConfig,
    setIsRuntimeMappingsEditorApplyButtonEnabled,
    advancedEditorRuntimeMappingsLastApplied,
    advancedRuntimeMappingsConfig,
  }) => {
    return (
      <div data-test-subj="mlDataFrameAnalyticsAdvancedRuntimeMappingsEditor">
        <CodeEditor
          height={250}
          languageId={'json'}
          onChange={(d: string) => {
            setAdvancedRuntimeMappingsConfig(d);

            // Disable the "Apply"-Button if the config hasn't changed.
            if (advancedEditorRuntimeMappingsLastApplied === d) {
              setIsRuntimeMappingsEditorApplyButtonEnabled(false);
              return;
            }

            // Enable Apply button so user can remove previously created runtime field
            if (d === '') {
              setIsRuntimeMappingsEditorApplyButtonEnabled(true);
              return;
            }

            // Try to parse the string passed on from the editor.
            // If parsing fails, the "Apply"-Button will be disabled
            try {
              const parsedJson = JSON.parse(convertToJson(d));
              setIsRuntimeMappingsEditorApplyButtonEnabled(isRuntimeMappings(parsedJson));
            } catch (e) {
              setIsRuntimeMappingsEditorApplyButtonEnabled(false);
            }
          }}
          options={{
            ariaLabel: i18n.translate(
              'xpack.ml.dataframe.analytics.createWizard.runtimeMappings.advancedEditorAriaLabel',
              {
                defaultMessage: 'Advanced runtime editor',
              }
            ),
            automaticLayout: true,
            fontSize: 12,
            scrollBeyondLastLine: false,
            quickSuggestions: true,
            minimap: {
              enabled: false,
            },
            wordWrap: 'on',
            wrappingIndent: 'indent',
          }}
          value={advancedRuntimeMappingsConfig}
        />
      </div>
    );
  },
  (prevProps, nextProps) => isEqual(pickProps(prevProps), pickProps(nextProps))
);

function pickProps(props: Props) {
  return [props.advancedEditorRuntimeMappingsLastApplied, props.advancedRuntimeMappingsConfig];
}
