import React from 'react';
import type { CustomLink } from '../../../../../common/custom_link/custom_link_types';
interface Props {
    items: CustomLink[];
    onCustomLinkSelected: (customLink: CustomLink) => void;
}
export declare function CustomLinkTable({ items, onCustomLinkSelected }: Props): React.JSX.Element;
export {};
