/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import React, { useRef, useState, useCallback } from 'react';
import styled from 'styled-components';

import { FieldsBrowser } from './field_browser';
import * as i18n from './translations';
import type { FieldBrowserProps } from './types';

const FIELDS_BUTTON_CLASS_NAME = 'fields-button';

/** wait this many ms after the user completes typing before applying the filter input */
export const INPUT_TIMEOUT = 250;

const FieldsBrowserButtonContainer = styled.div`
  display: inline-block;
  position: relative;
`;

FieldsBrowserButtonContainer.displayName = 'FieldsBrowserButtonContainer';
/**
 * Manages the state of the field browser
 */
export const StatefulFieldsBrowserComponent: React.FC<FieldBrowserProps> = ({
  timelineId,
  columnHeaders,
  browserFields,
  createFieldComponent,
  width,
}) => {
  const customizeColumnsButtonRef = useRef<HTMLButtonElement | null>(null);
  /** show the field browser */
  const [show, setShow] = useState(false);

  /** Shows / hides the field browser */
  const onShow = useCallback(() => {
    setShow(true);
  }, []);

  return (
    <FieldsBrowserButtonContainer data-test-subj="fields-browser-button-container">
      <EuiToolTip content={i18n.FIELDS_BROWSER}>
        <EuiButtonEmpty
          aria-label={i18n.FIELDS_BROWSER}
          buttonRef={customizeColumnsButtonRef}
          className={FIELDS_BUTTON_CLASS_NAME}
          color="text"
          data-test-subj="show-field-browser"
          iconType="tableOfContents"
          onClick={onShow}
          size="xs"
        >
          {i18n.FIELDS}
        </EuiButtonEmpty>
      </EuiToolTip>

      {show && (
        <FieldsBrowser
          browserFields={browserFields}
          createFieldComponent={createFieldComponent}
          columnHeaders={columnHeaders}
          restoreFocusTo={customizeColumnsButtonRef}
          setShow={setShow}
          show={show}
          timelineId={timelineId}
          width={width}
        />
      )}
    </FieldsBrowserButtonContainer>
  );
};

export const StatefulFieldsBrowser = React.memo(StatefulFieldsBrowserComponent);
