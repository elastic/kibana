import React from 'react';
import type { APMLinkExtendProps } from '../apm_link_hooks';
export declare const txGroupsDroppedBucketName = "_other";
interface Props extends APMLinkExtendProps {
    transactionName: string;
    href: string;
}
export declare function TransactionDetailLink({ transactionName, href, ...rest }: Props): React.JSX.Element;
export {};
