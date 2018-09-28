/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

const PageControlsUI = ({ pageId, onDelete, onDuplicate, intl }) => {
  const handleDuplicate = ev => {
    ev.preventDefault();
    onDuplicate(pageId);
  };

  const handleDelete = ev => {
    ev.preventDefault();
    onDelete(pageId);
  };

  return (
    <EuiFlexGroup
      className="canvasPageManager__controls"
      gutterSize="xs"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            <FormattedMessage
              id="xpack.canvas.page.preview.duplicateButtonTooltip"
              defaultMessage="Duplicate"
            />
          }
        >
          <EuiButtonIcon
            iconType="document"
            aria-label={intl.formatMessage({
              id: 'xpack.canvas.page.preview.duplicateButtonAriaLabel',
              defaultMessage: 'Duplicate Page',
            })}
            onClick={handleDuplicate}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            <FormattedMessage
              id="xpack.canvas.page.preview.deleteButtonTooltip"
              defaultMessage="Delete"
            />
          }
        >
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            aria-label={intl.formatMessage({
              id: 'xpack.canvas.page.preview.deleteButtonAriaLabel',
              defaultMessage: 'Delete Page',
            })}
            onClick={handleDelete}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

PageControlsUI.propTypes = {
  pageId: PropTypes.string.isRequired,
  pageNumber: PropTypes.number.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
};

export const PageControls = injectI18n(PageControlsUI);
