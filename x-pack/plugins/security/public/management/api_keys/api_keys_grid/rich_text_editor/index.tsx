/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTitleProps } from '@elastic/eui';
import {
  EuiAvatar,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHighlight,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiPortal,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { Children, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BaseEditor, BaseElement, BaseRange, BaseText, Descendant } from 'slate';
import {
  createEditor,
  Editor,
  Path,
  Element as SlateElement,
  Node as SlateNode,
  Transforms,
} from 'slate';
import type { ReactEditor, RenderElementProps, RenderLeafProps } from 'slate-react';
import { Editable, Slate, useFocused, useSelected, useSlate, withReact } from 'slate-react';

export interface FormattedText extends BaseText {
  bold?: true;
  italic?: true;
  underline?: true;
  code?: true;
}
export interface TitleElement extends BaseElement {
  type: 'title';
  size: EuiTitleProps['size'];
}
export interface ParagraphElement extends BaseElement {
  type: 'paragraph';
}
export interface CodeElement extends BaseElement {
  type: 'code';
  language?: string;
  children: BaseText[];
}
export interface MentionElement extends BaseElement {
  type: 'mention';
  username?: string;
  children: BaseText[];
}
export interface ListElement extends BaseElement {
  type: 'list';
  listType: string;
  children: ListItemElement[];
}
export interface ListItemElement extends BaseElement {
  type: 'listItem';
  children: Descendant[];
}
export type CustomElement =
  | TitleElement
  | ParagraphElement
  | CodeElement
  | MentionElement
  | ListElement
  | ListItemElement;

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: FormattedText;
  }
}

export const RichTextEditor = () => {
  const editor = useMemo(() => withShortcuts(withMentions(withReact(createEditor()))), []);
  const [value, setValue] = useState<Descendant[]>([
    {
      type: 'title',
      size: 's',
      children: [{ text: 'Heading' }],
    },
    {
      type: 'paragraph',
      children: [
        { text: 'This is editable ' },
        { text: 'rich', bold: true },
        { text: ' text, ' },
        { text: 'much', italic: true },
        { text: ' better than a ' },
        { text: '<textarea>', code: true },
        { text: '!' },
      ],
    },
    {
      type: 'paragraph',
      children: [
        {
          type: 'mention',
          username: 'larry',
          children: [{ text: '@Larry' }],
        },
        { text: ' What do you think?' },
      ],
    },
    {
      type: 'list',
      listType: 'bullet',
      children: [
        {
          type: 'listItem',
          children: [{ text: 'list' }],
        },
        {
          type: 'listItem',
          children: [{ text: 'items' }],
        },
      ],
    },
    {
      type: 'code',
      language: 'html',
      children: [{ text: '<a href="https://elastic.co">Elastic</a>\nhi' }],
    },
  ]);

  return (
    <Slate editor={editor} value={value} onChange={(nextValue) => setValue(nextValue)}>
      <EuiSplitPanel.Outer hasBorder>
        <EuiSplitPanel.Inner
          color="subdued"
          paddingSize="s"
          className="euiMarkdownEditorToolbar__buttons"
        >
          <BlockSelect />
          <span className="euiMarkdownEditorToolbar__divider" />
          <MarkButton format="bold" iconType="editorBold" aria-label="Bold" />
          <MarkButton format="italic" iconType="editorItalic" aria-label="Italic" />
          <MarkButton format="underline" iconType="editorUnderline" aria-label="Underline" />
          <span className="euiMarkdownEditorToolbar__divider" />
          <BlockButton format="list" iconType="editorUnorderedList" aria-label="List" />
          <BlockButton format="list" iconType="editorOrderedList" aria-label="List" />
          <span className="euiMarkdownEditorToolbar__divider" />
          <EuiButtonIcon iconType="editorLink" color="text" aria-label="Link" />
          <EuiButtonIcon iconType="user" color="text" aria-label="Mention" />
          <EuiButtonIcon iconType="quote" color="text" aria-label="Quote" />
          <BlockButton format="code" iconType="editorCodeBlock" aria-label="Code snippet" />
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <EuiText size="s">
            <Editable renderElement={renderElement} renderLeaf={renderLeaf} />
          </EuiText>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </Slate>
  );
};

interface MarkButtonProps {
  iconType: string;
  format: keyof Omit<FormattedText, 'text'>;
}

const MarkButton: FunctionComponent<MarkButtonProps> = ({ format, iconType }) => {
  const editor = useSlate();
  const isSelected = isMarkActive(editor, format);
  return (
    <EuiButtonIcon
      iconType={iconType}
      color="text"
      display={isSelected ? 'base' : 'empty'}
      aria-label="Bold"
      isSelected={isSelected}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    />
  );
};

interface BlockButtonProps {
  iconType: string;
  format: CustomElement['type'];
}

const BlockButton: FunctionComponent<BlockButtonProps> = ({ format, iconType }) => {
  const editor = useSlate();
  const isSelected = isBlockActive(editor, format);
  return (
    <EuiButtonIcon
      iconType={iconType}
      color="text"
      display={isSelected ? 'base' : 'empty'}
      aria-label="Bold"
      isSelected={isSelected}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    />
  );
};

const BlockSelect: FunctionComponent = () => {
  const editor = useSlate();
  const [isOpen, setIsOpen] = useState(false);

  const isParagraphActive = isBlockActive(editor, 'paragraph');
  const isTitle1Active = isBlockActive(editor, 'title', 'size', 'm');
  const isTitle2Active = isBlockActive(editor, 'title', 'size', 's');
  const isTitle3Active = isBlockActive(editor, 'title', 'size', 'xs');
  const isTitle4Active = isBlockActive(editor, 'title', 'size', 'xxs');

  const button = (
    <EuiButtonEmpty
      size="s"
      color="text"
      iconType="arrowDown"
      iconSide="right"
      onMouseDown={(event) => {
        event.preventDefault();
        setIsOpen(!isOpen);
      }}
      isDisabled={
        !isParagraphActive &&
        !isTitle1Active &&
        !isTitle2Active &&
        !isTitle3Active &&
        !isTitle4Active
      }
    >
      {isTitle1Active
        ? 'Heading 1'
        : isTitle2Active
        ? 'Heading 2'
        : isTitle3Active
        ? 'Heading 3'
        : isTitle4Active
        ? 'Heading 4'
        : 'Normal text'}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <EuiContextMenuPanel
        initialFocusedItemIndex={
          isTitle1Active ? 1 : isTitle2Active ? 2 : isTitle3Active ? 3 : isTitle4Active ? 4 : 0
        }
        items={[
          <EuiContextMenuItem key="paragraph" onClick={() => toggleBlock(editor, 'paragraph')}>
            <p>Normal text</p>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="title1"
            onClick={() => toggleBlock(editor, 'title', 'size', 'm')}
          >
            <EuiTitle size="m">
              <h2>Heading 1</h2>
            </EuiTitle>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="title2"
            onClick={() => toggleBlock(editor, 'title', 'size', 's')}
          >
            <EuiTitle size="s">
              <h2>Heading 2</h2>
            </EuiTitle>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="title3"
            onClick={() => toggleBlock(editor, 'title', 'size', 'xs')}
          >
            <EuiTitle size="xs">
              <h2>Heading 3</h2>
            </EuiTitle>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="title4"
            onClick={() => toggleBlock(editor, 'title', 'size', 'xxs')}
          >
            <EuiTitle size="xxs">
              <h2>Heading 4</h2>
            </EuiTitle>
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

const withMentions = (editor: Editor) => {
  const { isInline, isVoid, normalizeNode } = editor;

  editor.isInline = (element) => {
    return element.type === 'mention' ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === 'mention' && element.username ? true : isVoid(element);
  };

  // editor.normalizeNode = (entry) => {
  //   const [node, path] = entry;

  //   // If the element is a paragraph, ensure its children are valid.
  //   if (SlateElement.isElement(node) && node.type === 'paragraph') {
  //     for (const [child, childPath] of SlateNode.children(editor, path)) {
  //       if (SlateElement.isElement(child) && !editor.isInline(child)) {
  //         Transforms.unwrapNodes(editor, { at: childPath });
  //         return;
  //       }
  //     }
  //   }

  //   // If the element is a code block, ensure its children are valid text node.
  //   if (SlateElement.isElement(node) && node.type === 'code') {
  //     for (const [child, childPath] of SlateNode.children(editor, path)) {
  //       if (SlateElement.isElement(child)) {
  //         Transforms.unwrapNodes(editor, { at: childPath });
  //         return;
  //       }
  //       const marks = Object.keys(child).filter((mark) => mark !== 'text');
  //       if (marks.length > 0) {
  //         Transforms.unsetNodes(editor, marks, {
  //           at: childPath,
  //         });
  //         return;
  //       }
  //     }
  //   }

  //   // Fall back to the original `normalizeNode` to enforce other constraints.
  //   normalizeNode(entry);
  // };

  return editor;
};

const withShortcuts = (editor: Editor) => {
  const { insertText, insertBreak, deleteBackward } = editor;

  editor.insertBreak = () => {
    const block = Editor.above<CustomElement>(editor, {
      match: (node) => Editor.isBlock(editor, node),
    });
    if (block) {
      const [element] = block;
      console.log(element.type);
      switch (element.type) {
        case 'title':
          Transforms.insertNodes(editor, {
            type: 'paragraph',
            children: [{ text: '' }],
          });
          return;

        case 'mention':
          return;

        case 'listItem':
          if (SlateNode.string(element).trim() === '') {
            Transforms.liftNodes(editor);
            Transforms.setNodes(editor, { type: 'paragraph' });
            return;
          }
          break;

        case 'code':
          if (SlateNode.string(element).endsWith('\n')) {
            Transforms.insertNodes(editor, {
              type: 'paragraph',
              children: [{ text: '' }],
            });
            return;
          }
          Transforms.insertText(editor, '\n');
          return;
      }
    }

    insertBreak();
  };

  editor.insertText = (text) => {
    const { selection } = editor;

    if (selection) {
      const { anchor } = selection;
      const block = Editor.above(editor, {
        match: (node) => Editor.isBlock(editor, node),
      });
      const path = block ? block[1] : [];
      const range = { anchor, focus: Editor.start(editor, path) };
      const beforeText = Editor.string(editor, range);
      const line = `${beforeText}${text}`;

      if (line === '```') {
        Transforms.select(editor, range);
        Transforms.delete(editor);
        const newProperties: Partial<SlateElement> = {
          type: 'code',
        };
        Transforms.setNodes<SlateElement>(editor, newProperties, {
          match: (n) => Editor.isBlock(editor, n),
        });
        return;
      } else if (text === '@') {
        Transforms.insertNodes(editor, {
          type: 'mention',
          username: undefined,
          children: [{ text }],
        });
        return;
      } else if (text === ' ') {
        if (isBlockActive(editor, 'mention')) {
          Transforms.unwrapNodes(editor, {
            match: (node) =>
              !Editor.isEditor(node) &&
              SlateElement.isElement(node) &&
              node.type === 'mention' &&
              !node.username,
          });
          Transforms.insertText(editor, text);
          return;
        }
      }
    }

    insertText(text);
  };

  editor.deleteBackward = (...args) => {
    deleteBackward(...args);
  };

  return editor;
};
export const renderLeaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  if (leaf.bold) {
    children = <strong {...attributes}>{children}</strong>;
  }

  if (leaf.italic) {
    children = <em {...attributes}>{children}</em>;
  }

  if (leaf.underline) {
    children = <u {...attributes}>{children}</u>;
  }

  if (leaf.code) {
    children = <EuiCode {...attributes}>{children}</EuiCode>;
  }

  return <span {...attributes}>{children}</span>;
};

export const renderElement = ({ attributes, children, element }: RenderElementProps) => {
  switch (element.type) {
    case 'title':
      return (
        <EuiTitle size={element.size} {...attributes}>
          <h1>{children}</h1>
        </EuiTitle>
      );

    case 'code':
      return (
        <EuiCodeBlock language={element.language} paddingSize="m" lineNumbers {...attributes}>
          {children}
        </EuiCodeBlock>
      );

    case 'mention':
      return (
        <MentionElement element={element} attributes={attributes}>
          {children}
        </MentionElement>
      );

    case 'list':
      return <ul {...attributes}>{children}</ul>;

    case 'listItem':
      return <li {...attributes}>{children}</li>;

    default:
      return <p {...attributes}>{children}</p>;
  }
};

export interface MentionElementProps extends RenderElementProps {
  element: MentionElement;
}

export const MentionElement: FunctionComponent<MentionElementProps> = ({
  element,
  children,
  attributes,
}) => {
  const editor = useSlate();
  const selected = useSelected();
  const focused = useFocused();
  const text = SlateNode.string(element).replace('@', '');

  return (
    <span
      contentEditable={!element.username}
      style={
        {
          // display: 'inline-block',
          // boxShadow: element.username && selected && focused ? '0 0 0 2px #B4D5FF' : 'none',
        }
      }
    >
      {element.username ? (
        <EuiLink href={`#${element.username}`} {...attributes}>
          {`@${text}`}
          {children}
        </EuiLink>
      ) : (
        <EuiPopover
          button={children}
          isOpen={selected}
          initialFocus={false}
          ownFocus={false}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          hasArrow={false}
          style={{ verticalAlign: 'baseline' }}
          {...attributes}
        >
          {['Thom', 'Larry', 'Joe', 'Oleg', 'Thomas', 'Xavier']
            .filter((username) => username.toLowerCase().includes(text.toLowerCase()))
            .map((username) => (
              <EuiContextMenuItem
                key={username}
                icon={<EuiAvatar size="s" name={username} />}
                size="s"
                onClick={(event) => {
                  event.preventDefault();
                  const nodeEntry = Editor.above(editor, {
                    match: (node) => node === element,
                  });
                  console.log(nodeEntry);
                  if (nodeEntry) {
                    const [, path] = nodeEntry;
                    console.log(path);
                    Transforms.setNodes(editor, { username }, { at: path });
                    Transforms.insertText(editor, `@${username}`, { at: path, voids: true });
                    // Transforms.insertText(editor, '===', { at: [2, 4] });
                    // Transforms.move(editor);
                  }
                }}
              >
                <EuiHighlight search={text} highlightAll>
                  {username}
                </EuiHighlight>
              </EuiContextMenuItem>
            ))}
        </EuiPopover>
      )}
    </span>
  );
};

export const isMarkActive = (editor: Editor, format: keyof Omit<FormattedText, 'text'>) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

export const toggleMark = (editor: Editor, format: keyof Omit<FormattedText, 'text'>) => {
  if (isMarkActive(editor, format)) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

export const isBlockActive = (
  editor: Editor,
  type: CustomElement['type'],
  key?: string,
  value?: any
) => {
  if (!editor.selection) {
    return false;
  }

  const [match] = Editor.nodes(editor, {
    at: Editor.unhangRange(editor, editor.selection),
    match: (node) =>
      !Editor.isEditor(node) &&
      SlateElement.isElement(node) &&
      node.type === type &&
      (!key || node[key] === value),
  });

  return !!match;
};

export const toggleBlock = (
  editor: Editor,
  type: CustomElement['type'],
  key?: string,
  value?: any
) => {
  const isActive = isBlockActive(editor, type, key, value);

  Transforms.unwrapNodes(editor, {
    match: (node) => !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === 'list',
    split: true,
  });

  Transforms.setNodes<CustomElement>(editor, {
    type: isActive ? 'paragraph' : type === 'list' ? 'listItem' : type,
    [key!]: value,
  });

  if (!isActive && type === 'list') {
    Transforms.wrapNodes(editor, { type, listType: 'bullet', children: [] });
  }
};
