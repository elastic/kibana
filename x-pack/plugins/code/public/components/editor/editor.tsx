/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import { editor as editorInterfaces } from 'monaco-editor';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
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
import { encodeRevisionString } from '../../utils/url';

export interface EditorActions {
  closeReferences(changeUrl: boolean): void;
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
  private lineDecorations: string[] | null = null;

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
        if (this.props.showBlame) {
          this.loadBlame(this.props.blames);
        }
      });
    }
  }

  public componentDidUpdate(prevProps: Props) {
    const { file } = this.props;
    const { uri, path, revision } = file.payload;
    const {
      resource,
      org,
      repo,
      revision: routeRevision,
      path: routePath,
    } = this.props.match.params;
    const prevContent = prevProps.file && prevProps.file.content;

    if (prevContent !== file.content) {
      this.loadText(file.content!, uri, path, file.lang!, revision).then(() => {
        if (this.props.revealPosition) {
          this.revealPosition(this.props.revealPosition);
        }
      });
    } else if (
      file.payload.uri === `${resource}/${org}/${repo}` &&
      file.payload.revision === routeRevision &&
      file.payload.path === routePath &&
      this.props.revealPosition &&
      prevProps.revealPosition !== this.props.revealPosition
    ) {
      this.revealPosition(this.props.revealPosition);
    }
    if (this.monaco && this.monaco.editor) {
      if (prevProps.showBlame !== this.props.showBlame && this.props.showBlame) {
        this.loadBlame(this.props.blames);
        this.monaco.editor.updateOptions({ lineHeight: 38 });
      } else if (!this.props.showBlame) {
        this.destroyBlameWidgets();
        this.monaco.editor.updateOptions({ lineHeight: 18, lineDecorationsWidth: 16 });
      }
      if (prevProps.blames !== this.props.blames && this.props.showBlame) {
        this.loadBlame(this.props.blames);
        this.monaco.editor.updateOptions({ lineHeight: 38, lineDecorationsWidth: 316 });
      }
    }
  }

  public componentWillUnmount() {
    this.monaco!.destroy();
  }
  public render() {
    return (
      <EuiFlexItem data-test-subj="codeSourceViewer" className="code-no-overflow" grow={1}>
        <Shortcut
          keyCode="f"
          help="With editor ‘active’ Find in file"
          linuxModifier={[Modifier.ctrl]}
          macModifier={[Modifier.meta]}
          winModifier={[Modifier.ctrl]}
        />
        <div tabIndex={0} className="code-editor-container" id="mainEditor" />
        {this.renderReferences()}
      </EuiFlexItem>
    );
  }

  public loadBlame(blames: GitBlame[]) {
    if (this.blameWidgets) {
      this.destroyBlameWidgets();
    }
    this.blameWidgets = blames.map((b, index) => {
      return new BlameWidget(b, index === 0, this.monaco!.editor!);
    });
    if (!this.lineDecorations) {
      this.lineDecorations = this.monaco!.editor!.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(1, 1, Infinity, 1),
            options: { isWholeLine: true, linesDecorationsClassName: 'code-line-decoration' },
          },
        ]
      );
    }
  }

  public destroyBlameWidgets() {
    if (this.blameWidgets) {
      this.blameWidgets.forEach((bw: BlameWidget) => bw.destroy());
    }
    if (this.lineDecorations) {
      this.monaco!.editor!.deltaDecorations(this.lineDecorations!, []);
      this.lineDecorations = null;
    }
    this.blameWidgets = null;
  }

  private async loadText(text: string, repo: string, file: string, lang: string, revision: string) {
    if (this.monaco) {
      this.editor = await this.monaco.loadFile(repo, file, text, lang, revision);
      this.editor.onMouseDown((e: editorInterfaces.IEditorMouseEvent) => {
        if (e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
          const uri = `${repo}/blob/${encodeRevisionString(revision)}/${file}`;
          history.push(`/${uri}!L${e.target.position.lineNumber}:0`);
        }
        this.monaco!.container.focus();
      });
    }
  }

  private revealPosition(pos: Position | undefined) {
    if (this.monaco) {
      if (pos) {
        this.monaco.revealPosition(pos.line, pos.character);
      } else {
        this.monaco.clearLineSelection();
      }
    }
  }

  private renderReferences() {
    return (
      this.props.isReferencesOpen && (
        <ReferencesPanel
          onClose={() => this.props.closeReferences(true)}
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
  )(EditorComponent)
);
