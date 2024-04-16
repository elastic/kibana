/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useEffect, useRef, useState } from 'react';
import { JsonCodeEditor } from '@kbn/unified-doc-viewer-plugin/public';
import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { JSON_TAB_CONTENT_TEST_ID, JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID } from './test_ids';
import { useRightPanelContext } from '../context';

const FLYOUT_BODY_PADDING = 24;
const COPY_TO_CLIPBOARD_BUTTON_HEIGHT = 24;
const FLYOUT_FOOTER_HEIGHT = 72;

/**
 * Json view displayed in the document details expandable flyout right section
 */
export const JsonTab: FC = memo(() => {
  const { searchHit, isPreview } = useRightPanelContext();
  const jsonValue = JSON.stringify(searchHit, null, 2);

  const flexGroupElement = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState<number>();

  useEffect(() => {
    const topPosition = flexGroupElement?.current?.getBoundingClientRect().top || 0;
    const footerOffset = isPreview ? 0 : FLYOUT_FOOTER_HEIGHT;
    const height =
      window.innerHeight -
      topPosition -
      COPY_TO_CLIPBOARD_BUTTON_HEIGHT -
      FLYOUT_BODY_PADDING -
      footerOffset;

    if (height === 0) {
      return;
    }

    setEditorHeight(height);
  }, [setEditorHeight, isPreview]);

  return (
    <EuiFlexGroup
      ref={flexGroupElement}
      direction="column"
      gutterSize="none"
      data-test-subj={JSON_TAB_CONTENT_TEST_ID}
    >
      <EuiFlexItem>
        <EuiFlexGroup justifyContent={'flexEnd'}>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={jsonValue}>
              {(copy) => (
                <EuiButtonEmpty
                  iconType={'copyClipboard'}
                  size={'xs'}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.flyout.right.jsonTab.copyToClipboardButtonAriaLabel',
                    {
                      defaultMessage: 'Copy to clipboard',
                    }
                  )}
                  data-test-subj={JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID}
                  onClick={copy}
                  onKeyDown={copy}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.right.jsonTab.copyToClipboardButtonLabel"
                    defaultMessage="Copy to clipboard"
                  />
                </EuiButtonEmpty>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <JsonCodeEditor
          json={searchHit as unknown as Record<string, unknown>}
          height={editorHeight}
          hasLineNumbers={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

JsonTab.displayName = 'JsonTab';
