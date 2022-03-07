/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineId } from '../../../../common/types';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useCreateFieldButton, CreateFieldEditorActionsRef } from './create_field_button';
import { getFieldTableColumns } from './field_table_columns';

export type { CreateFieldEditorActions } from './create_field_button';

export interface UseFieldBrowserOptions {
  sourcererScope: SourcererScopeName;
  timelineId: TimelineId;
  editorActionsRef?: CreateFieldEditorActionsRef;
}

export const useFieldBrowserOptions = ({
  sourcererScope,
  timelineId,
  editorActionsRef,
}: UseFieldBrowserOptions) => {
  const createFieldButton = useCreateFieldButton(sourcererScope, timelineId, editorActionsRef);
  return {
    createFieldButton,
    getFieldTableColumns,
  };
};
