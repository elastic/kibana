/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportDocumentHead, ReportSource } from '../../../common/types';
import { Report } from '.';

/*
 * Class for a report document that is saved in Elasticsearch
 */
export class SavedReport extends Report {
  public _index: string;
  public _id: string;
  public _primary_term: number;
  public _seq_no: number;

  constructor(opts: Partial<ReportSource> & Partial<ReportDocumentHead>) {
    super(opts);

    if (opts._id == null || opts._index == null) {
      throw new Error(
        `Report is not editable: Job [${opts._id}/${opts._index}] is not synced with ES!`
      );
    }

    if (opts._seq_no == null || opts._primary_term == null) {
      throw new Error(
        `Report is not editable: Job [${opts._id}] is missing _seq_no and _primary_term fields!`
      );
    }

    const { _id, _index, _seq_no, _primary_term } = opts;

    this._id = _id;
    this._index = _index;
    this._primary_term = _primary_term;
    this._seq_no = _seq_no;
  }
}
