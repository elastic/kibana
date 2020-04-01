/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { textService } from '../text';

type ChangeDocTitleHandler = (newTitle: string | string[]) => void;

class DocTitleService {
  private changeDocTitleHandler: ChangeDocTitleHandler = () => {};

  public setup(_changeDocTitleHandler: ChangeDocTitleHandler): void {
    this.changeDocTitleHandler = _changeDocTitleHandler;
  }

  public setTitle(page?: string): void {
    if (!page || page === 'home') {
      this.changeDocTitleHandler(`${textService.breadcrumbs.home}`);
    } else if (textService.breadcrumbs[page]) {
      this.changeDocTitleHandler(
        `${textService.breadcrumbs[page]} - ${textService.breadcrumbs.home}`
      );
    }
  }
}

export const docTitleService = new DocTitleService();
