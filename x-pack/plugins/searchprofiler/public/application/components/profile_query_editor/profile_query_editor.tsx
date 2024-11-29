/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, memo, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiForm,
  EuiFieldText,
  EuiFormRow,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';

import { decompressFromEncodedURIComponent } from 'lz-string';

import { useRequestProfile } from '../../hooks';
import { useAppContext } from '../../contexts/app_context';
import { useProfilerActionContext } from '../../contexts/profiler_context';
import { Editor, type EditorProps } from './editor';

const DEFAULT_INDEX_VALUE = '_all';

const INITIAL_EDITOR_VALUE = `{
  "query":{
    "match_all" : {}
  }
}`;

/**
 * This component should only need to render once.
 *
 * Drives state changes for mine via profiler action context.
 */
export const ProfileQueryEditor = memo(() => {
  const editorPropsRef = useRef<EditorProps>(null as any);
  const indexInputRef = useRef<HTMLInputElement>(null as any);

  const dispatch = useProfilerActionContext();

  const { getLicenseStatus, notifications, location } = useAppContext();

  const queryParams = new URLSearchParams(location.search);
  const indexName = queryParams.get('index');
  const searchProfilerQueryURI = queryParams.get('load_from');

  const searchProfilerQuery =
    searchProfilerQueryURI &&
    decompressFromEncodedURIComponent(searchProfilerQueryURI.replace(/^data:text\/plain,/, ''));
  const [editorValue, setEditorValue] = useState(
    searchProfilerQuery ? searchProfilerQuery : INITIAL_EDITOR_VALUE
  );

  const requestProfile = useRequestProfile();

  const handleProfileClick = async () => {
    dispatch({ type: 'setProfiling', value: true });
    try {
      const { data: result, error } = await requestProfile({
        query: editorValue,
        index: indexInputRef.current.value,
      });
      if (error) {
        notifications.addDanger(error);
        editorPropsRef.current.focus();
        return;
      }
      if (result === null) {
        return;
      }
      dispatch({ type: 'setCurrentResponse', value: result });
    } finally {
      dispatch({ type: 'setProfiling', value: false });
    }
  };

  const onEditorReady = useCallback(
    (editorPropsInstance: EditorProps) => (editorPropsRef.current = editorPropsInstance),
    []
  );
  const licenseEnabled = getLicenseStatus().valid;

  return (
    <EuiFlexGroup responsive={false} gutterSize="none" direction="column">
      {/* Form */}
      <EuiFlexItem grow={false}>
        <EuiForm>
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="flexEnd">
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.searchProfiler.formIndexLabel', {
                  defaultMessage: 'Index',
                })}
              >
                <EuiFieldText
                  data-test-subj="indexName"
                  disabled={!licenseEnabled}
                  inputRef={(ref) => {
                    if (ref) {
                      indexInputRef.current = ref;
                      ref.value = indexName ? indexName : DEFAULT_INDEX_VALUE;
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.searchProfiler.sendRequestButtonTooltipContent', {
                  defaultMessage: 'Click to send request',
                })}
              >
                <EuiButtonIcon
                  iconType={'playFilled'}
                  data-test-subj="profileButton"
                  disabled={!licenseEnabled}
                  onClick={() => handleProfileClick()}
                  size="m"
                  display="base"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      </EuiFlexItem>

      {/* Editor */}
      <EuiFlexItem>
        <Editor
          onEditorReady={onEditorReady}
          setEditorValue={setEditorValue}
          editorValue={editorValue}
          licenseEnabled={licenseEnabled}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
