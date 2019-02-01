/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import { editor as editorInterfaces } from 'monaco-editor';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';
import { Hover, Position, TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { GitBlame } from '../../../common/git_blame';
import { closeReferences, FetchFileResponse, findReferences, hoverResult } from '../../actions';
import { MainRouteParams } from '../../common/types';
import { BlameWidget } from '../../monaco/blame/blame_widget';
import { monaco } from '../../monaco/monaco';
import { MonacoHelper } from '../../monaco/monaco_helper';
import { RootState } from '../../reducers';
import { refUrlSelector } from '../../selectors';
import { history } from '../../utils/url';
import { Modifier, Shortcut } from '../shortcuts';
import { ReferencesPanel } from './references_panel';

export interface EditorActions {
  closeReferences(): void;
  findReferences(params: TextDocumentPositionParams): void;
  hoverResult(hover: Hover): void;
}

interface Props {
  file: FetchFileResponse;
  revealPosition?: Position;
  isReferencesOpen: boolean;
  isReferencesLoading: boolean;
  references: any[];
  referencesTitle: string;
  hover?: Hover;
  refUrl?: string;
  blames: GitBlame[];
  showBlame: boolean;
}

type IProps = Props & EditorActions & RouteComponentProps<MainRouteParams>;

export class EditorComponent extends React.Component<IProps> {
  public blameWidgets: any;
  private container: HTMLElement | undefined;
  private monaco: MonacoHelper | undefined;
  private editor: editorInterfaces.IStandaloneCodeEditor | undefined;

  constructor(props: IProps, context: any) {
    super(props, context);
  }

  public componentDidMount(): void {
    this.container = document.getElementById('mainEditor') as HTMLElement;
    this.monaco = new MonacoHelper(this.container, this.props);

    const { file } = this.props;
    if (file && file.content) {
      const { uri, path, revision } = file.payload;
      this.loadText(file.content, uri, path, file.lang!, revision).then(() => {
        if (this.props.revealPosition) {
          this.revealPosition(this.props.revealPosition);
        }
      });
    }
    if (this.props.showBlame) {
      this.loadBlame(this.props.blames);
    }
  }

  public componentWillReceiveProps(nextProps: Props) {
    if (nextProps.revealPosition && nextProps.revealPosition !== this.props.revealPosition) {
      this.revealPosition(nextProps.revealPosition);
    }
    const { file } = nextProps;
    const currentFileContent = this.props.file.content;
    if (file.content && file.content !== currentFileContent) {
      const { uri, path, revision } = file.payload;
      this.loadText(file.content, uri, path, file.lang!, revision).then(() => {
        if (nextProps.revealPosition) {
          this.revealPosition(nextProps.revealPosition);
        }
      });
    }
    if (nextProps.showBlame !== this.props.showBlame && nextProps.showBlame) {
      this.loadBlame(nextProps.blames);
      this.monaco!.editor!.updateOptions({ lineHeight: 38 });
    } else if (!nextProps.showBlame) {
      this.destroyBlameWidgets();
      this.monaco!.editor!.updateOptions({ lineHeight: 24 });
    }
    if (nextProps.blames !== this.props.blames && nextProps.showBlame) {
      this.loadBlame(nextProps.blames);
      this.monaco!.editor!.updateOptions({ lineHeight: 38 });
    }
  }

  public componentWillUnmount() {
    this.monaco!.destroy();
  }
  public render() {
    return (
      <EuiFlexItem className="code-no-overflow" grow={1}>
        <Shortcut
          keyCode="f"
          help="With editor ‘active’ Find in file"
          linuxModifier={[Modifier.ctrl]}
          macModifier={[Modifier.meta]}
          winModifier={[Modifier.ctrl]}
        />
        <EuiFlexItem
          tabIndex={0}
          grow={1}
          className="code-editor-container code-no-overflow"
          id="mainEditor"
          style={{ paddingLeft: this.props.showBlame ? 300 : 0 }}
        />
        {this.renderReferences()}
      </EuiFlexItem>
    );
  }

  public loadBlame(blames: GitBlame[]) {
    this.blameWidgets = blames.map((b, index) => {
      return new BlameWidget(b, index === 0, this.editor!);
    });
  }

  public destroyBlameWidgets() {
    if (this.blameWidgets) {
      this.blameWidgets.forEach((bw: BlameWidget) => bw.destroy());
    }
    this.blameWidgets = null;
  }

  private async loadText(text: string, repo: string, file: string, lang: string, revision: string) {
    if (this.monaco) {
      this.editor = await this.monaco.loadFile(repo, file, text, lang, revision);
      this.editor.onMouseDown((e: editorInterfaces.IEditorMouseEvent) => {
        if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
          const { repo: repoName, org, resource, pathType, path } = this.props.match.params;
          const uri = `${resource}/${org}/${repoName}/${pathType}/${revision}/${path}`;
          history.push(`/${uri}!L${e.target.position.lineNumber}:0`);
        }
        this.monaco!.container.focus();
      });
    }
  }

  private revealPosition({ line, character }: Position) {
    if (this.monaco) {
      this.monaco.revealPosition(line, character);
    }
  }

  private renderReferences() {
    return (
      this.props.isReferencesOpen && (
        <ReferencesPanel
          onClose={this.props.closeReferences}
          references={this.props.references}
          isLoading={this.props.isReferencesLoading}
          title={this.props.referencesTitle}
          refUrl={this.props.refUrl}
        />
      )
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  file: state.file.file,
  isReferencesOpen: state.editor.showing,
  isReferencesLoading: state.editor.loading,
  references: state.editor.references,
  referencesTitle: state.editor.referencesTitle,
  hover: state.editor.hover,
  refUrl: refUrlSelector(state),
  revealPosition: state.editor.revealPosition,
  blames: state.blame.blames,
});

const mapDispatchToProps = {
  closeReferences,
  findReferences,
  hoverResult,
};

export const Editor = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
    // @ts-ignore
  )(EditorComponent)
);
