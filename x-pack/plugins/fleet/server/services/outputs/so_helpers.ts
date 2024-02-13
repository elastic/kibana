/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { outputType } from '../../../common/constants';
import type { KafkaOutput, Output } from '../../../common/types';
import type { OutputSOAttributes } from '../../types';

type Nullable<T> = { [P in keyof T]: T[P] | null };

/**
 * Patch update data to make sure we do not break encrypted field
 * allow_edit and secrets field are not excluded from AAD, we cannot change this anymore,
 * we need to make sure each time those fields are changed encrypted field are changed too.
 */
export function patchUpdateDataWithRequireEncryptedAADFields(
  updateData: Nullable<Partial<OutputSOAttributes>>,
  originalOutput: Output
): Nullable<Partial<OutputSOAttributes>> {
  const newOutputType = updateData.type ? updateData.type : originalOutput.type;

  //  Add ssl so it's re-encrypted if allow_edit or secrets changed
  if ((updateData.allow_edit || updateData.secrets) && !updateData.ssl) {
    updateData.ssl = originalOutput.ssl ? JSON.stringify(originalOutput.ssl) : undefined;
  }

  //  Add password so it's re-encrypted if allow_edit or secrets changed
  if (
    (updateData.allow_edit || updateData.secrets) &&
    newOutputType === outputType.Kafka &&
    !(updateData as KafkaOutput).password
  ) {
    (updateData as KafkaOutput).password = (originalOutput as KafkaOutput).password;
  }

  // Always include allow_edit and secrets as there included in AAD to encrypt the SO
  if (!updateData.allow_edit && originalOutput.allow_edit) {
    updateData.allow_edit = originalOutput.allow_edit;
  }
  if (!updateData.secrets && originalOutput.secrets) {
    updateData.secrets = originalOutput.secrets;
  }

  return updateData;
}
