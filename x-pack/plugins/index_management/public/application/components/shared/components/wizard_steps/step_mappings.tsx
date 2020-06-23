/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { Forms } from '../../../../../shared_imports';
import {
  MappingsEditor,
  OnUpdateHandler,
  LoadMappingsFromJsonButton,
  IndexSettings,
} from '../../../mappings_editor';

interface Props {
  defaultValue: { [key: string]: any };
  onChange: (content: Forms.Content) => void;
  indexSettings?: IndexSettings;
  esDocsBase: string;
}

export const StepMappings: React.FunctionComponent<Props> = React.memo(
  ({ defaultValue, onChange, indexSettings, esDocsBase }) => {
    const [mappings, setMappings] = useState(defaultValue);

    const onMappingsEditorUpdate = useCallback<OnUpdateHandler>(
      ({ isValid, getData, validate }) => {
        onChange({
          isValid,
          async validate() {
            return isValid === undefined ? await validate() : isValid;
          },
          getData,
        });
      },
      [onChange]
    );

    const onJsonLoaded = (json: { [key: string]: any }): void => {
      setMappings(json);
    };

    return (
      <div data-test-subj="stepMappings">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2 data-test-subj="stepTitle">
                <FormattedMessage
                  id="xpack.idxMgmt.formWizard.stepMappings.stepTitle"
                  defaultMessage="Mappings (optional)"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.idxMgmt.formWizard.stepMappings.mappingsDescription"
                  defaultMessage="Define how to store and index documents."
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <LoadMappingsFromJsonButton onJson={onJsonLoaded} />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  flush="right"
                  href={`${esDocsBase}/mapping.html`}
                  target="_blank"
                  iconType="help"
                >
                  <FormattedMessage
                    id="xpack.idxMgmt.formWizard.stepMappings.docsButtonLabel"
                    defaultMessage="Mapping docs"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {/* Mappings editor */}
        <MappingsEditor
          value={mappings}
          onChange={onMappingsEditorUpdate}
          indexSettings={indexSettings}
        />

        <EuiSpacer size="m" />
      </div>
    );
  }
);
