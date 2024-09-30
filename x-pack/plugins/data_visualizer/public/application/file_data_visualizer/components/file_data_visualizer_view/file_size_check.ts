/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import numeral from '@elastic/numeral';
import { FILE_SIZE_DISPLAY_FORMAT } from '../../../../../common/constants';
import { isTikaType } from '../../../../../common/utils/tika_utils';

export class FileSizeChecker {
  private _maxBytes: number;
  private _fileSize: number;
  constructor(fileUpload: FileUploadStartApi, file: File) {
    this._fileSize = file.size;
    this._maxBytes = isTikaType(file.type)
      ? fileUpload.getMaxTikaBytes()
      : fileUpload.getMaxBytes();
  }

  public check(): boolean {
    return this._fileSize <= this._maxBytes;
  }

  public maxBytes(): number {
    return this._maxBytes;
  }

  public fileSizeFormatted(): string {
    return numeral(this._fileSize).format(FILE_SIZE_DISPLAY_FORMAT);
  }
  public maxFileSizeFormatted(): string {
    return numeral(this._maxBytes).format(FILE_SIZE_DISPLAY_FORMAT);
  }
  public fileSizeDiffFormatted(): string {
    return numeral(this._fileSize - this._maxBytes).format(FILE_SIZE_DISPLAY_FORMAT);
  }
}
