/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

type titleProp = string | ((previousTitle: string) => string);

interface DocumentTitleProps {
  title: titleProp;
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

    private getTitle(title: titleProp) {
      return typeof title === 'function' ? title(titles[this.state.index - 1]) : title;
    }

    private pushTitle(title: string) {
      titles[this.state.index] = title;
    }

    private removeTitle() {
      titles.pop();
    }

    private updateDocumentTitle() {
      const title = (titles[titles.length - 1] || '') + TITLE_SUFFIX;
      if (title !== document.title) {
        document.title = title;
      }
    }
  };
};

export const DocumentTitle = wrapWithSharedState();
