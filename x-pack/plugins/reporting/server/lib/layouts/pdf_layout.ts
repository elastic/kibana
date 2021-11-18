/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomPageSize, PredefinedPageSize } from 'pdfmake/interfaces';
import type { PageSizeParams, PdfImageSize } from '../../../common/types';
import { Layout } from './layout';

export abstract class PdfLayout extends Layout {
  public abstract getPdfImageSize(): PdfImageSize;

  public abstract getPdfPageOrientation(): 'portrait' | 'landscape' | undefined;

  public abstract getPdfPageSize(
    pageSizeParams: PageSizeParams
  ): CustomPageSize | PredefinedPageSize;
}
