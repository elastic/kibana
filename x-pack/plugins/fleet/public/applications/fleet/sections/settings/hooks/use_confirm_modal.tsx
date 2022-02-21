/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiPortal } from '@elastic/eui';
import type { EuiConfirmModalProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useContext, useState } from 'react';

interface ModalState {
  title?: React.ReactNode;
  description?: React.ReactNode;
  buttonColor?: EuiConfirmModalProps['buttonColor'];
  onConfirm: () => void;
  onCancel: () => void;
}

interface ModalOptions {
  buttonColor?: EuiConfirmModalProps['buttonColor'];
}

const ModalContext = React.createContext<null | {
  showModal: (state: ModalState) => void;
}>(null);

export function useConfirmModal() {
  const context = useContext(ModalContext);

  const confirm = useCallback(
    async (title: React.ReactNode, description: React.ReactNode, options?: ModalOptions) => {
      if (context === null) {
        throw new Error('Context need to be provided to use useConfirmModal');
      }
      return new Promise<boolean>((resolve) => {
        context.showModal({
          title,
          description,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
          buttonColor: options?.buttonColor,
        });
      });
    },
    [context]
  );

  return {
    confirm,
  };
}

export function withConfirmModalProvider<T>(WrappedComponent: React.FunctionComponent<T>) {
  return (props: T) => (
    <ConfirmModalProvider>
      <WrappedComponent {...props} />
    </ConfirmModalProvider>
  );
}

export const ConfirmModalProvider: React.FunctionComponent = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    onCancel: () => {},
    onConfirm: () => {},
  });

  const showModal = useCallback(({ title, description, onConfirm, onCancel }) => {
    setIsVisible(true);
    setModal({
      title,
      description,
      onConfirm: () => {
        setIsVisible(false);
        onConfirm();
      },
      onCancel: () => {
        setIsVisible(false);
        onCancel();
      },
    });
  }, []);

  return (
    <ModalContext.Provider value={{ showModal }}>
      {isVisible && (
        <EuiPortal>
          <EuiConfirmModal
            title={modal.title}
            buttonColor={modal.buttonColor}
            onCancel={modal.onCancel}
            onConfirm={modal.onConfirm}
            cancelButtonText={i18n.translate('xpack.fleet.settings.confirmModal.cancelButtonText', {
              defaultMessage: 'Cancel',
            })}
            confirmButtonText={i18n.translate(
              'xpack.fleet.settings.confirmModal.confirmButtonText',
              {
                defaultMessage: 'Save and deploy',
              }
            )}
            defaultFocusedButton="confirm"
          >
            {modal.description}
          </EuiConfirmModal>
        </EuiPortal>
      )}
      {children}
    </ModalContext.Provider>
  );
};
