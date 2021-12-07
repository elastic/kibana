/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { Forms } from '../../../../../shared_imports';
import { useAppContext } from '../../../../app_context';
import {
  MappingsEditor,
  OnUpdateHandler,
  LoadMappingsFromJsonButton,
  IndexSettings,
} from '../../../mappings_editor';

interface Props {
  onChange: (content: Forms.Content) => void;
  esDocsBase: string;
  esNodesPlugins: string[];
  defaultValue?: { [key: string]: any };
  indexSettings?: IndexSettings;
}

export const StepMappings: React.FunctionComponent<Props> = React.memo(
  ({ defaultValue = {}, onChange, indexSettings, esDocsBase, esNodesPlugins }) => {
    const [mappings, setMappings] = useState(defaultValue);
    const { docLinks } = useAppContext();

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
                <LoadMappingsFromJsonButton onJson={onJsonLoaded} esNodesPlugins={esNodesPlugins} />
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
          docLinks={docLinks}
          esNodesPlugins={esNodesPlugins}
        />

        <EuiSpacer size="m" />
      </div>
    );
  }
);
