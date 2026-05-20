import type React from 'react';
export declare const Breadcrumb: ({ title, href, omitOnServerless, children, parentTitle, parentHref, }: {
    title: string;
    href: string;
    omitOnServerless?: boolean;
    children: React.ReactElement;
    parentTitle?: string;
    parentHref?: string;
}) => React.ReactElement<any, string | React.JSXElementConstructor<any>>;
