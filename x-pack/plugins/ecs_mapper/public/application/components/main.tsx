/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import {
    EuiButton,
    EuiCard,
    EuiFlexGroup,
    EuiFlexItem,
    EuiIcon,
    EuiPage,
    EuiPageBody,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getPluginsStart } from '../../kibana_services';

export const EcsMapperMainUi: FC = () => {    
    const { fileUpload } = getPluginsStart();
    
    if (fileUpload === undefined) {
        // eslint-disable-next-line no-console
        console.error('Ecs Mapper plugin not available');
        return null;
    }

    const maxFileSize = fileUpload.getMaxBytesFormatted();

    return (
        <Fragment>
            <EuiPage data-test-subj="ecsMapperMain">
                <EuiPageBody>
                    <EuiFlexGroup alignItems="center" justifyContent="spaceAround">
                        <EuiFlexItem grow={false}>
                            <EuiCard
                                icon={<EuiIcon size="xxl" type="addDataApp" />}
                                title={
                                    <FormattedMessage
                                        id="xpack.ecsMapper.importDataTitle"
                                        defaultMessage="Import mapping"
                                    />
                                }
                                description={
                                    <FormattedMessage
                                        id="xpack.ecsMapper.importDataDescription"
                                        defaultMessage="Import ECS mapping from CSV file. You can upload files up to {maxFileSize}."
                                        values={{ maxFileSize }} 
                                    />
                                }
                                footer={
                                    <EuiButton
                                        target="_self"
                                        //onClick={() => navigateToPath('/filedatavisualizer')}
                                        data-test-subj="ecsMapperUploadFileButton"
                                    >
                                        <FormattedMessage
                                            id="xpack.ecsMapper.uploadFileButtonLabel"
                                            defaultMessage="Select file"
                                        />
                                    </EuiButton>
                                }
                                data-test-subj="ecsMapperImportData"
                            />
                        </EuiFlexItem>
                    </EuiFlexGroup>
                </EuiPageBody>
            </EuiPage>
        </Fragment>
    );
};

