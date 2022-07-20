/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiLoadingSpinner, EuiPanel, EuiText } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import type { SavedObject, SavedObjectAttributes } from '@kbn/core/public';
import { useKibana, useToasts } from '../../../lib/kibana';
import { bulkCreatePrebuiltSavedObjects } from '../apis/bulk_create_prebuilt_saved_objects';
import { IMPORT_SAVED_OBJECTS_FAILURE, IMPORT_SAVED_OBJECTS_SUCCESS } from '../translations';

const Popover = styled(EuiPanel)`
  position: absolute;
  top: 100%;
  right: 0;
  width: '340px';
`;

const PopoverWrapper = styled.div`
  position: relative;
`;

interface ImportSavedObjectsButtonProps {
  href?: string | null | undefined;
  ishostRiskScoreDataAvailable: boolean;
  onSuccessCallback?: (result: Array<SavedObject<SavedObjectAttributes>>) => void;
  successTitle: string;
  title: string;
  tooltip?: string;
}

const ImportSavedObjectsButtonComponent: React.FC<ImportSavedObjectsButtonProps> = ({
  href,
  ishostRiskScoreDataAvailable,
  onSuccessCallback,
  successTitle,
  title,
  tooltip,
}) => {
  const {
    services: { http },
  } = useKibana();
  const [response, setResponse] = useState<Array<SavedObject<SavedObjectAttributes>>>();
  const [error, setError] = useState<Error>();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const toasts = useToasts();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>();

  const onMouseEnter = () => {
    setIsPopoverOpen(true);
  };

  const closePopover = () => setIsPopoverOpen(false);
  const importPrebuiltSavedObjects = useCallback(async () => {
    setStatus('loading');

    try {
      const res = await bulkCreatePrebuiltSavedObjects(http, {
        templateName: 'hostRiskScoreDashboards',
      });
      const savedObjects = getOr([], ['saved_objects'], res);
      setResponse(savedObjects);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e);
    }
  }, [http]);

  useEffect(() => {
    if (status === 'success' && response != null) {
      toasts.addSuccess(
        `${IMPORT_SAVED_OBJECTS_SUCCESS(response.length)}: ${response
          .map((o, idx) => `${idx + 1}. ) ${o?.attributes?.title ?? o?.attributes?.name}`)
          .join(' ,')}`
      );
    }

    if (onSuccessCallback && response != null) {
      onSuccessCallback(response);
    }

    if (status === 'error' && error != null) {
      toasts.addError(error, { title: IMPORT_SAVED_OBJECTS_FAILURE, toastMessage: error.message });
    }
  }, [error, onSuccessCallback, response, status, toasts]);

  return href || status === 'success' ? (
    <EuiButton
      href={href ?? undefined}
      isDisabled={!href}
      data-test-subj="view-dashboard-button"
      target="_blank"
    >
      {successTitle}
    </EuiButton>
  ) : ishostRiskScoreDataAvailable ? (
    <EuiButton
      onClick={importPrebuiltSavedObjects}
      color="warning"
      target="_blank"
      isDisabled={status === 'loading'}
      data-test-subj="create-saved-object-button"
    >
      {status === 'loading' && <EuiLoadingSpinner size="m" />} {title}
    </EuiButton>
  ) : tooltip ? (
    <PopoverWrapper onMouseEnter={onMouseEnter} onMouseLeave={closePopover}>
      {isPopoverOpen && (
        <Popover>
          <EuiText>{tooltip} </EuiText>
        </Popover>
      )}
      <EuiButton
        color="warning"
        target="_blank"
        isDisabled={true}
        data-test-subj="disabled-create-saved-object-button-with-popover"
      >
        {title}
      </EuiButton>
    </PopoverWrapper>
  ) : (
    <EuiButton
      color="warning"
      target="_blank"
      isDisabled={true}
      data-test-subj="disabled-create-saved-object-button"
    >
      {title}
    </EuiButton>
  );
};

export const ImportSavedObjectsButton = React.memo(ImportSavedObjectsButtonComponent);
