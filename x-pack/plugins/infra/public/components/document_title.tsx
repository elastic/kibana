/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

type TitleProp = string | ((previousTitle: string) => string);

interface DocumentTitleProps {
  title: TitleProp;
}

interface DocumentTitleState {
  index: number;
}

const wrapWithSharedState = () => {
  const titles: string[] = [];
  const TITLE_SUFFIX = ' - Kibana';

  return class extends React.Component<DocumentTitleProps, DocumentTitleState> {
    public componentDidMount() {
      this.setState(
        () => {
          return { index: titles.push('') - 1 };
        },
        () => {
          this.pushTitle(this.getTitle(this.props.title));
          this.updateDocumentTitle();
        }
      );
    }

    public componentDidUpdate() {
      this.pushTitle(this.getTitle(this.props.title));
      this.updateDocumentTitle();
    }

    public componentWillUnmount() {
      this.removeTitle();
      this.updateDocumentTitle();
    }

    public render() {
      return null;
    }

    public getTitle(title: TitleProp) {
      return typeof title === 'function' ? title(titles[this.state.index - 1]) : title;
    }

    public pushTitle(title: string) {
      titles[this.state.index] = title;
    }

    public removeTitle() {
      titles.pop();
    }

    public updateDocumentTitle() {
      const title = (titles[titles.length - 1] || '') + TITLE_SUFFIX;
      if (title !== document.title) {
        document.title = title;
      }
    }
  };
};

export const DocumentTitle = wrapWithSharedState();
