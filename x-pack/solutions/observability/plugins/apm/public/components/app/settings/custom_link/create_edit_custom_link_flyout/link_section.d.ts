import React from 'react';
interface Props {
    label?: string;
    onChangeLabel: (label: string) => void;
    url?: string;
    onChangeUrl: (url: string) => void;
}
export declare function LinkSection({ label, onChangeLabel, url, onChangeUrl }: Props): React.JSX.Element;
export {};
