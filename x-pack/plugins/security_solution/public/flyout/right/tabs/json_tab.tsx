/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useEffect, useRef, useState } from 'react';
import { JsonCodeEditor } from '@kbn/unified-doc-viewer-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CopyToClipboard } from '../../shared/components/copy_to_clipboard';
import { JSON_TAB_CONTENT_TEST_ID, JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID } from './test_ids';
import { useRightPanelContext } from '../context';

const FLYOUT_BODY_PADDING = 24;
const COPY_TO_CLIPBOARD_BUTTON_HEIGHT = 24;
const FLYOUT_FOOTER_HEIGHT = 72;

/**
 * Json view displayed in the document details expandable flyout right section
 */
export const JsonTab: FC = memo(() => {
  const { searchHit } = useRightPanelContext();
  const jsonValue = JSON.stringify(searchHit, null, 2);

  const flexGroupElement = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState<number>();

  useEffect(() => {
    const topPosition = flexGroupElement?.current?.getBoundingClientRect().top || 0;
    const height =
      window.innerHeight -
      topPosition -
      COPY_TO_CLIPBOARD_BUTTON_HEIGHT -
      FLYOUT_BODY_PADDING -
      FLYOUT_FOOTER_HEIGHT;

    if (height === 0) {
      return;
    }

    setEditorHeight(height);
  }, [setEditorHeight]);

  return (
    <EuiFlexGroup
      ref={flexGroupElement}
      direction={'column'}
      gutterSize={'none'}
      data-test-subj={JSON_TAB_CONTENT_TEST_ID}
    >
      <EuiFlexItem>
        <EuiFlexGroup justifyContent={'flexEnd'}>
          <EuiFlexItem grow={false}>
            <CopyToClipboard
              rawValue={jsonValue}
              text={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.jsonTab.copyToClipboardButtonLabel"
                  defaultMessage="Copy to clipboard"
                />
              }
              iconType={'copyClipboard'}
              size={'xs'}
              ariaLabel={i18n.translate(
                'xpack.securitySolution.flyout.right.jsonTab.copyToClipboardButtonAriaLabel',
                {
                  defaultMessage: 'Copy to clipboard',
                }
              )}
              data-test-subj={JSON_TAB_COPY_TO_CLIPBOARD_BUTTON_TEST_ID}
            />
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
