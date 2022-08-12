/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useCallback, useState } from 'react';
import type { SavedObject, SavedObjectAttributes } from '@kbn/core/public';
import { useKibana } from '../../../lib/kibana';
import { bulkCreatePrebuiltSavedObjects } from '../apis/bulk_create_prebuilt_saved_objects';
import { IMPORT_SAVED_OBJECTS_FAILURE, IMPORT_SAVED_OBJECTS_SUCCESS } from '../translations';
import { useAppToasts } from '../../../hooks/use_app_toasts';

interface ImportSavedObjectsButtonProps {
  hide: boolean;
  onSuccessCallback?: (result: Array<SavedObject<SavedObjectAttributes>>) => void;
  successLink?: string | undefined;
  successTitle: string;
  templateName: string;
  title: string;
}

const ImportSavedObjectsButtonComponent: React.FC<ImportSavedObjectsButtonProps> = ({
  hide,
  onSuccessCallback,
  successLink,
  successTitle,
  templateName,
  title,
}) => {
  const {
    services: { http },
  } = useKibana();

  const { addSuccess, addError } = useAppToasts();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>();

  const importPrebuiltSavedObjects = useCallback(async () => {
    setStatus('loading');

    try {
      const res = await bulkCreatePrebuiltSavedObjects(http, {
        templateName,
      });
      const savedObjects: Array<SavedObject<SavedObjectAttributes>> = getOr(
        [],
        ['saved_objects'],
        res
      );
      setStatus('success');

      addSuccess({
        title: IMPORT_SAVED_OBJECTS_SUCCESS(savedObjects.length),
        text: savedObjects.map((o) => o?.attributes?.title ?? o?.attributes?.name).join(', '),
      });

      if (onSuccessCallback) {
        onSuccessCallback(savedObjects);
      }
    } catch (e) {
      setStatus('error');
      addError(e, { title: IMPORT_SAVED_OBJECTS_FAILURE, toastMessage: e.message });
    }
  }, [addError, addSuccess, http, onSuccessCallback, templateName]);

  if (successLink || status === 'success') {
    return (
      <EuiButton
        href={successLink}
        isDisabled={!successLink}
        data-test-subj="create-saved-object-success-button"
        target="_blank"
      >
        {successTitle}
      </EuiButton>
    );
  }

  if (!hide) {
    return (
      <EuiButton
        onClick={importPrebuiltSavedObjects}
        target="_blank"
        isDisabled={status === 'loading'}
        data-test-subj="create-saved-object-button"
      >
        {status === 'loading' && (
          <EuiLoadingSpinner data-test-subj="creating-saved-objects" size="m" />
        )}{' '}
        {title}
      </EuiButton>
    );
  } else {
    return null;
  }
};

export const ImportSavedObjectsButton = React.memo(ImportSavedObjectsButtonComponent);
