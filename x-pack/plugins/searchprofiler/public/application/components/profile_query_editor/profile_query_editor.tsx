/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, memo, useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiForm,
  EuiFieldText,
  EuiFormRow,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiSpacer,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';

import { decompressFromEncodedURIComponent } from 'lz-string';

import { useIndices, useRequestProfile } from '../../hooks';
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
  const [hasIndices, setHasIndices] = useState(false);

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

  const indices = useIndices();

  const getHasIndices = useCallback(async () => {
    const response = await indices();
    setHasIndices(response.hasIndices);
  }, [indices]);

  useEffect(() => {
    getHasIndices();
  }, [getHasIndices]);

  return (
    <EuiFlexGroup responsive={false} gutterSize="none" direction="column">
      {/* Form */}
      <EuiFlexItem grow={false}>
        <EuiForm>
          <EuiFlexGroup direction="row" gutterSize="s">
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
          </EuiFlexGroup>
        </EuiForm>
      </EuiFlexItem>

      {/* Editor */}
      <EuiFlexItem grow={10}>
        <Editor
          onEditorReady={onEditorReady}
          setEditorValue={setEditorValue}
          editorValue={editorValue}
          licenseEnabled={licenseEnabled}
        />
      </EuiFlexItem>

      {/* Button */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          className="prfDevTool__profileButtonContainer"
          gutterSize="none"
          direction="row"
        >
          <EuiFlexItem grow={5}>
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={5}>
            {licenseEnabled && !hasIndices ? (
              <EuiToolTip
                position="top"
                content={i18n.translate('xpack.searchProfiler.formProfileButtonTooltip', {
                  defaultMessage: 'An index must be created before leveraging Search Profiler',
                })}
              >
                <EuiButton
                  data-test-subj="disabledprofileButton"
                  fill
                  disabled={true}
                  onClick={() => {}}
                >
                  <EuiText>
                    {i18n.translate('xpack.searchProfiler.formProfileButtonLabel', {
                      defaultMessage: 'Profile',
                    })}
                  </EuiText>
                </EuiButton>
              </EuiToolTip>
            ) : (
              <EuiButton
                data-test-subj="profileButton"
                fill
                disabled={!licenseEnabled}
                onClick={() => handleProfileClick()}
              >
                <EuiText>
                  {i18n.translate('xpack.searchProfiler.formProfileButtonLabel', {
                    defaultMessage: 'Profile',
                  })}
                </EuiText>
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
