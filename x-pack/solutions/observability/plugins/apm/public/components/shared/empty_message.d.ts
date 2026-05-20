import type { EuiEmptyPromptProps } from '@elastic/eui';
import React from 'react';
interface Props {
    heading?: string;
    subheading?: EuiEmptyPromptProps['body'];
    hideSubheading?: boolean;
}
declare function EmptyMessage({ heading, subheading, hideSubheading, }: Props): React.JSX.Element;
export { EmptyMessage };
