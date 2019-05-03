/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Tag, TagFields } from '../../model';
import { LoggerFactory } from '../utils/log_factory';

export class CtagsReader {
  private tags: Tag[] = [];

  private MIN_METHOD_LINE_LENGTH = 6;
  private MAX_METHOD_LINE_LENGTH = 1030;

  constructor(
    readonly loggerFactory: LoggerFactory
  ) {}

  public getTags(): Tag[] {
    return this.tags;
  }

  public readLine(tagLine: string) {
    // const logger = this.loggerFactory.getLogger(['code', 'ctagsReader']);

    if (tagLine === null) {
      return;
    }

    let p = tagLine.indexOf('\t');
    if (p <= 0) {
      return;
    }
    const def = tagLine.substring(0, p);
    const mstart = tagLine.indexOf('\t', p + 1);

    let kind = null;

    let lp = tagLine.length;
    let tagFieldMap = new Map();
    while((p = tagLine.lastIndexOf('\t', lp - 1)) > 0) {
      const fld = tagLine.substring(p + 1, lp);
      lp = p;

      const sep = fld.indexOf(':');
      let matchTagField = null;
      if (sep != -1) {
        for (let tagField in TagFields) {
          if (TagFields[tagField].charAt(0) !== fld.charAt(0)) {
            continue;
          } else {
            matchTagField = TagFields[tagField];
          }
        }
        if (matchTagField !== null) {
          tagFieldMap.set(matchTagField, fld.substring(sep + 1));
        }
      } else {
          kind = fld;
          break;
      }
    }

    let lnum = tagFieldMap.get(TagFields.LINE);
    let signature = tagFieldMap.get(TagFields.SIGNATURE);
    let classInher = tagFieldMap.get(TagFields.CLASS);

    let whole;
    let match;
    const mlength = p - mstart;
    if ((p > 0) && (mlength > this.MIN_METHOD_LINE_LENGTH)) {
      whole = this.cutPattern(tagLine, mstart, p);
      if (mlength < this.MAX_METHOD_LINE_LENGTH) {
        match = whole.replace(/[ \t]+/g, ' ');
      } else {
        match = whole.substring(0, this.MAX_METHOD_LINE_LENGTH).replace(/[ \t]+/g, ' ');
      }
    } else {
      return;
    }

    let range = this.bestIndexOfTag(+lnum, whole, def);
    this.tags.push(new Tag(+lnum, def, kind!, match, classInher, signature, range[0], range[1], classInher));
  }

  private cutPattern(tagLine: string, startTab: number, endTab: number): string {
    let cut = tagLine.substring(startTab + 3, endTab);

    if (cut.endsWith("$/;\"")) {
      cut = cut.substring(0, cut.length - 4);
    } else if (cut.endsWith("/;\"")) {
      cut = cut.substring(0, cut.length - 3);
    } else {
      cut = cut.substring(0, cut.length - 4);
    }
    return cut.replace("\\\\", "\\").replace("\\/", "/");
  }

  private bestIndexOfTag(line: number, wholeStr: string, tagName: string): [number, number] {
    if (wholeStr.length < 1) {
      return [0, 1];
    } else {
      let woff = this.strictIndexOf(wholeStr, tagName);
      if (woff >= 0) {
        return [woff, woff + tagName.length];
      } else {
        woff = wholeStr.indexOf(tagName);
        return [woff, woff + tagName.length];
      }
    }
  }

  private strictIndexOf(wholeStr: string, subStr: string): number {
    let WORD_CHAR: RegExp = new RegExp('\w');

    let stricLeft: boolean = subStr.length > 0 && WORD_CHAR.test(subStr.charAt(0));
    let strictRight: boolean = subStr.length > 0 && WORD_CHAR.test(subStr.charAt(subStr.length - 1));

    let spos = 0;
    do {
      let woff = wholeStr.indexOf(subStr, spos);
      if (woff < 0) {
        return -1;
      }

      spos = woff + 1;

      if (stricLeft && woff > 0) {
        if (WORD_CHAR.test(wholeStr.charAt(woff - 1))) {
          continue;
        }
      }

      if (strictRight && (woff + subStr.length) < wholeStr.length) {
        if (WORD_CHAR.test(wholeStr.charAt(woff + subStr.length))) {
          continue;
        }
      }
      return woff;
    } while (spos < wholeStr.length);
    return -1;
  }

}
