import React from 'react';
import type { CustomLink } from '../../../../../common/custom_link/custom_link_types';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
export declare function CustomLinkList({ customLinks, transaction, }: {
    customLinks: CustomLink[];
    transaction?: Transaction;
}): React.JSX.Element;
